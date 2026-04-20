import { supabase } from '../../lib/supabase.js'
import { etiquetaCliente } from '../../utils/clienteLabel.js'

function num(v) {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

/**
 * Une varias filas abiertas de cuentas_por_cobrar del mismo cliente y moneda en la más antigua.
 * @param {object[]} rows mismo cliente_id y moneda, estado ≠ cerrada
 * @param {number} montoAdicional suma al total adeudado (0 solo fusiona duplicados)
 * @param {{ operacion_id?: string|null }} [opts]
 */
async function mergeCuentasPorCobrarGrupo(rows, montoAdicional, opts = {}) {
  if (!rows?.length) return
  const sorted = [...rows].sort((a, b) => {
    const ta = new Date(a.created_at).getTime()
    const tb = new Date(b.created_at).getTime()
    if (ta !== tb) return ta - tb
    return String(a.id).localeCompare(String(b.id), 'en')
  })
  const keeper = sorted[0]
  const others = sorted.slice(1)
  const add = Math.max(0, num(montoAdicional))

  const sumTotal = sorted.reduce((acc, r) => acc + num(r.monto_total), 0)
  const sumPagado = sorted.reduce((acc, r) => acc + num(r.monto_pagado), 0)
  const newMontoTotal = sumTotal + add
  const newMontoPagado = sumPagado
  const newSaldo = Math.max(0, newMontoTotal - newMontoPagado)

  let newEstado = 'pendiente'
  if (newSaldo <= 1e-9) newEstado = 'cerrada'
  else if (newMontoPagado > 1e-9) newEstado = 'parcial'

  let opId = opts.operacion_id ?? null
  if (others.length > 0) {
    opId = null
  } else if (opId == null) {
    opId = keeper.operacion_id ?? null
  }

  const { error: eUp } = await supabase
    .from('cuentas_por_cobrar')
    .update({
      monto_total: newMontoTotal,
      monto_pagado: newMontoPagado,
      saldo: newSaldo,
      estado: newEstado,
      operacion_id: opId,
    })
    .eq('id', keeper.id)
  if (eUp) throw eUp

  if (others.length > 0) {
    const ids = others.map((r) => r.id)
    const { error: eDel } = await supabase.from('cuentas_por_cobrar').delete().in('id', ids)
    if (eDel) throw eDel
  }
}

/**
 * Inserta o fusiona una cuenta por cobrar: una sola fila abierta por cliente y moneda.
 * @param {{ cliente_id: string, moneda: string, montoAdicional: number, operacion_id?: string|null, estado?: string }} p
 */
export async function upsertCuentaPorCobrarUnificada({
  cliente_id,
  moneda,
  montoAdicional,
  operacion_id = null,
  estado = 'pendiente',
}) {
  if (!cliente_id) throw new Error('Falta cliente.')
  const mon = String(moneda ?? '')
    .trim()
    .toUpperCase()
  if (mon !== 'USD' && mon !== 'USDT') {
    throw new Error('La moneda debe ser USD o USDT.')
  }
  const add = num(montoAdicional)
  if (!(add > 0)) {
    throw new Error('El monto debe ser mayor que 0.')
  }

  const { data: existentes, error: eSel } = await supabase
    .from('cuentas_por_cobrar')
    .select('*')
    .eq('cliente_id', cliente_id)
    .eq('moneda', mon)
    .neq('estado', 'cerrada')
    .order('created_at', { ascending: true })
  if (eSel) throw eSel
  const rows = existentes ?? []

  const est = String(estado ?? 'pendiente').toLowerCase()
  const estadoInsert = est === 'parcial' ? 'parcial' : 'pendiente'

  if (rows.length === 0) {
    const { error: eIns } = await supabase.from('cuentas_por_cobrar').insert([
      {
        cliente_id,
        moneda: mon,
        monto_total: add,
        monto_pagado: 0,
        saldo: add,
        estado: estadoInsert,
        operacion_id: operacion_id ?? null,
      },
    ])
    if (eIns) throw eIns
    return
  }

  await mergeCuentasPorCobrarGrupo(rows, add, { operacion_id })
}

function tieneDuplicadosPorClienteMonedaCxc(rows) {
  const seen = new Set()
  for (const r of rows) {
    const k = `${r.cliente_id}::${r.moneda}`
    if (seen.has(k)) return true
    seen.add(k)
  }
  return false
}

async function consolidarDuplicadosCxcEnDb(estadoFilter) {
  let cq = supabase.from('cuentas_por_cobrar').select('*').order('created_at', { ascending: true })
  if (estadoFilter && estadoFilter !== 'todo') cq = cq.eq('estado', estadoFilter)
  else cq = cq.neq('estado', 'cerrada')
  const { data, error } = await cq
  if (error) throw error
  const rows = data ?? []
  const byKey = new Map()
  for (const r of rows) {
    const k = `${r.cliente_id}::${r.moneda}`
    if (!byKey.has(k)) byKey.set(k, [])
    byKey.get(k).push(r)
  }
  let merged = false
  for (const [, group] of byKey) {
    if (group.length > 1) {
      await mergeCuentasPorCobrarGrupo(group, 0, { operacion_id: null })
      merged = true
    }
  }
  return merged
}

/**
 * @param {'cobrar'|'pagar'} kind
 * @param {{ estado?: string, q?: string }} filters estado: 'todo' | valor concreto
 */
export async function fetchDeudas(kind, { estado = 'todo', q = '' } = {}) {
  const table = kind === 'cobrar' ? 'cuentas_por_cobrar' : 'cuentas_por_pagar'
  let query = supabase
    .from(table)
    .select('*, clientes(nombre, alias, telefono)')
    .order('created_at', { ascending: false })

  if (estado && estado !== 'todo') {
    query = query.eq('estado', estado)
  } else {
    query = query.neq('estado', 'cerrada')
  }

  const { data, error } = await query
  if (error) throw error

  let rows = data ?? []

  if (kind === 'cobrar' && rows.length > 0 && tieneDuplicadosPorClienteMonedaCxc(rows)) {
    try {
      const did = await consolidarDuplicadosCxcEnDb(estado)
      if (did) {
        let q2 = supabase
          .from(table)
          .select('*, clientes(nombre, alias, telefono)')
          .order('created_at', { ascending: false })
        if (estado && estado !== 'todo') q2 = q2.eq('estado', estado)
        else q2 = q2.neq('estado', 'cerrada')
        const { data: d2, error: e2 } = await q2
        if (!e2) rows = d2 ?? []
      }
    } catch {
      /* si falla la consolidación, se muestran las filas tal cual */
    }
  }

  const qq = q.trim().toLowerCase()
  if (qq) {
    rows = rows.filter((r) => {
      const c = r.clientes
      const name = [c?.nombre, c?.alias, c?.telefono].filter(Boolean).join(' ').toLowerCase()
      return name.includes(qq) || String(r.id).toLowerCase().includes(qq)
    })
  }
  return rows
}

/**
 * @param {object} params
 * @param {'cobrar'|'pagar'} params.kind
 * @param {object} params.deuda fila de cuentas_por_cobrar o cuentas_por_pagar
 * @param {string|number} params.montoAbono
 * @param {'USD'|'USDT'} [params.monedaCaja] moneda del movimiento en caja (por defecto la de la cuenta)
 */
export async function registrarAbono({ kind, deuda, montoAbono, monedaCaja }) {
  const table = kind === 'cobrar' ? 'cuentas_por_cobrar' : 'cuentas_por_pagar'
  const monto = Number(montoAbono)
  if (!Number.isFinite(monto) || monto <= 0) {
    throw new Error('El monto del abono debe ser mayor que 0.')
  }

  const saldo = Number(deuda.saldo ?? 0)
  const montoPagado = Number(deuda.monto_pagado ?? 0)
  const montoTotal = Number(deuda.monto_total ?? 0)

  if (monto > saldo + 1e-9) {
    throw new Error('El abono no puede ser mayor que el saldo pendiente.')
  }

  const montoPagadoNuevo = montoPagado + monto
  const saldoNuevo = Math.max(0, montoTotal - montoPagadoNuevo)
  const estadoNuevo = saldoNuevo <= 1e-9 ? 'cerrada' : montoPagadoNuevo > 0 ? 'parcial' : deuda.estado

  const { error: eUp } = await supabase
    .from(table)
    .update({
      monto_pagado: montoPagadoNuevo,
      saldo: saldoNuevo,
      estado: estadoNuevo,
    })
    .eq('id', deuda.id)

  if (eUp) throw eUp

  const monMov = String(monedaCaja ?? deuda.moneda ?? '')
    .trim()
    .toUpperCase()
  const monedaMovimiento = monMov === 'USDT' || monMov === 'USD' ? monMov : String(deuda.moneda ?? 'USD').toUpperCase()

  const tipoMov = kind === 'cobrar' ? 'ingreso' : 'egreso'
  const c = deuda.clientes
  const nombreCliente = etiquetaCliente(c, 'Cliente')
  const sufijoMon =
    monedaMovimiento !== String(deuda.moneda ?? '').toUpperCase()
      ? ` (caja ${monedaMovimiento})`
      : ''
  const nota =
    kind === 'cobrar'
      ? `Abono cuenta por cobrar — ${nombreCliente}${sufijoMon}`
      : `Abono cuenta por pagar — ${nombreCliente}${sufijoMon}`

  const { error: eMov } = await supabase.from('movimientos_caja').insert([
    {
      tipo: tipoMov,
      moneda: monedaMovimiento,
      monto,
      operacion_id: deuda.operacion_id ?? null,
      nota,
    },
  ])

  if (eMov) throw eMov

  if (saldoNuevo <= 1e-9 && deuda.operacion_id) {
    const { error: eOp } = await supabase
      .from('operaciones')
      .update({ estado: 'cerrada' })
      .eq('id', deuda.operacion_id)
    if (eOp) throw eOp
  }
}

/**
 * Alta manual de cuenta por cobrar o por pagar (sin operación asociada).
 * @param {'cobrar'|'pagar'} params.kind
 * @param {string} params.cliente_id
 * @param {string|number} params.monto_total
 * @param {'USD'|'USDT'} params.moneda
 */
export async function crearDeudaManual({ kind, cliente_id, monto_total, moneda }) {
  const monto = Number(monto_total)
  if (!cliente_id) {
    throw new Error('Selecciona un cliente.')
  }
  if (!Number.isFinite(monto) || monto <= 0) {
    throw new Error('El monto total debe ser mayor que 0.')
  }
  const mon = String(moneda ?? '')
    .trim()
    .toUpperCase()
  if (mon !== 'USD' && mon !== 'USDT') {
    throw new Error('La moneda debe ser USD o USDT.')
  }

  if (kind === 'cobrar') {
    await upsertCuentaPorCobrarUnificada({
      cliente_id,
      moneda: mon,
      montoAdicional: monto,
      operacion_id: null,
      estado: 'pendiente',
    })
    return
  }

  const table = 'cuentas_por_pagar'
  const { error } = await supabase.from(table).insert([
    {
      cliente_id,
      monto_total: monto,
      monto_pagado: 0,
      saldo: monto,
      estado: 'pendiente',
      moneda: mon,
      operacion_id: null,
    },
  ])
  if (error) throw error
}
