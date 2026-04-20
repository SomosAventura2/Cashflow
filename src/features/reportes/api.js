import { supabase } from '../../lib/supabase.js'
import { etiquetaCliente } from '../../utils/clienteLabel.js'
import { REPORTE_PERIODO } from '../../utils/constants.js'

const PAGE = 1000

/** Lunes 00:00 local (semana calendario común en negocio). */
function inicioSemanaLunes(isoOrDate) {
  const d = new Date(isoOrDate)
  if (Number.isNaN(d.getTime())) return null
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * @param {string|Date} isoOrDate
 * @param {typeof REPORTE_PERIODO[keyof typeof REPORTE_PERIODO]} timeframe
 * @returns {{ key: string, start: Date|null, etiqueta: string }}
 */
function bucketPeriodo(isoOrDate, timeframe) {
  const d = new Date(isoOrDate)
  if (Number.isNaN(d.getTime())) {
    return { key: '_', start: null, etiqueta: '—' }
  }

  if (timeframe === REPORTE_PERIODO.todo) {
    return { key: 'all', start: new Date(0), etiqueta: 'Todo el historial' }
  }

  if (timeframe === REPORTE_PERIODO.mensual) {
    const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
    const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`
    const etiqueta = start.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })
    return { key, start, etiqueta }
  }

  if (timeframe === REPORTE_PERIODO.quincenal) {
    const y = d.getFullYear()
    const m = d.getMonth()
    const day = d.getDate()
    const firstHalf = day <= 15
    const start = new Date(y, m, firstHalf ? 1 : 16, 0, 0, 0, 0)
    const lastDay = new Date(y, m + 1, 0).getDate()
    const end = new Date(y, m, firstHalf ? 15 : lastDay, 0, 0, 0, 0)
    const key = `${y}-${String(m + 1).padStart(2, '0')}-q${firstHalf ? 1 : 2}`
    const opt = { day: 'numeric', month: 'short' }
    const etiqueta = `${start.toLocaleDateString('es-VE', opt)} – ${end.toLocaleDateString('es-VE', opt)}`
    return { key, start, etiqueta }
  }

  // semanal (default)
  const start = inicioSemanaLunes(isoOrDate)
  if (!start) {
    return { key: '_', start: null, etiqueta: '—' }
  }
  const fin = new Date(start)
  fin.setDate(fin.getDate() + 6)
  const opt = { day: 'numeric', month: 'short' }
  const key = String(start.getTime())
  const etiqueta = `${start.toLocaleDateString('es-VE', opt)} – ${fin.toLocaleDateString('es-VE', opt)}`
  return { key, start, etiqueta }
}

async function fetchAllOperacionesReporte() {
  const all = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('operaciones')
      .select(
        'id, cliente_id, tipo, estado, modo_operacion, comision_moneda, ganancia, monto_entrada, monto_salida, created_at, clientes(id, nombre, alias)',
      )
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw error
    if (!data?.length) break
    all.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}

function buildFromRows(rows, timeframe = REPORTE_PERIODO.semanal) {
  /** @type {Map<string, { periodKey: string, periodStart: Date|null, etiqueta: string, count: number, ganancia: number, ventas: number, compras: number }>} */
  const porPeriodo = new Map()
  /** @type {Map<string, { cliente_id: string, nombre: string, ops: number, ganancia: number }>} */
  const porCliente = new Map()

  let gananciaTotal = 0
  let opsPropias = 0
  let opsInter = 0
  const porEstado = { pendiente: 0, cerrada: 0, otro: 0 }
  const porTipo = { venta: 0, compra: 0, otro: 0 }

  for (const r of rows) {
    const g = Number(r.ganancia) || 0
    gananciaTotal += g

    const tipo = String(r.tipo ?? '').toLowerCase()
    if (tipo === 'venta') porTipo.venta += 1
    else if (tipo === 'compra') porTipo.compra += 1
    else porTipo.otro += 1

    const est = String(r.estado ?? '').toLowerCase()
    if (est === 'cerrada') porEstado.cerrada += 1
    else if (est === 'pendiente' || est === 'parcial') porEstado.pendiente += 1
    else if (est) porEstado.otro += 1

    if (r.modo_operacion === 'intermediacion') opsInter += 1
    else opsPropias += 1

    const { key, start, etiqueta } = bucketPeriodo(r.created_at, timeframe)
    if (key !== '_') {
      if (!porPeriodo.has(key)) {
        porPeriodo.set(key, {
          periodKey: key,
          periodStart: start,
          etiqueta,
          count: 0,
          ganancia: 0,
          ventas: 0,
          compras: 0,
        })
      }
      const w = porPeriodo.get(key)
      w.count += 1
      w.ganancia += g
      if (tipo === 'venta') w.ventas += 1
      else if (tipo === 'compra') w.compras += 1
    }

    const cid = r.cliente_id
    if (cid) {
      const c = r.clientes
      const nombre = etiquetaCliente(c, 'Cliente')
      if (!porCliente.has(cid)) {
        porCliente.set(cid, { cliente_id: cid, nombre, ops: 0, ganancia: 0 })
      }
      const pc = porCliente.get(cid)
      pc.ops += 1
      pc.ganancia += g
    }
  }

  const periodos = Array.from(porPeriodo.values()).sort((a, b) => {
    if (timeframe === REPORTE_PERIODO.todo) return 0
    const ta = a.periodStart?.getTime() ?? 0
    const tb = b.periodStart?.getTime() ?? 0
    return tb - ta
  })

  const clientesArr = Array.from(porCliente.values())
  const topClientesGanancia = [...clientesArr].sort((a, b) => b.ganancia - a.ganancia).slice(0, 20)
  const topClientesOps = [...clientesArr].sort((a, b) => b.ops - a.ops).slice(0, 20)

  return {
    totalOperaciones: rows.length,
    gananciaTotal,
    porTipo,
    porEstado,
    opsPropias,
    opsInter,
    periodos,
    topClientesGanancia,
    topClientesOps,
    clientesConOperacion: clientesArr.length,
  }
}

/**
 * Resume métricas y series temporales desde filas ya cargadas (p. ej. al cambiar el periodo en UI).
 * @param {object[]} rows
 * @param {typeof REPORTE_PERIODO[keyof typeof REPORTE_PERIODO]} [timeframe]
 */
export function resumenReporteDesdeFilas(rows, timeframe = REPORTE_PERIODO.semanal) {
  return buildFromRows(rows, timeframe)
}

/**
 * @returns {{ error: string|null, data: object|null }}
 */
export async function fetchReportesResumen() {
  try {
    const [rows, countCli] = await Promise.all([
      fetchAllOperacionesReporte(),
      supabase.from('clientes').select('id', { count: 'exact', head: true }),
    ])

    const totalClientes = countCli.error ? null : countCli.count ?? 0

    return {
      error: null,
      data: {
        rows,
        totalClientes,
        errorClientes: countCli.error?.message ?? null,
      },
    }
  } catch (e) {
    return { error: e?.message ?? String(e), data: null }
  }
}
