import { supabase } from '../../lib/supabase.js'
import { normalizeMoneda, deltaMontoMovimientoCaja } from '../../lib/cajaBalance.js'

const PAGE = 1000

async function fetchAllRowsAscending(table, select) {
  const all = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
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

function cmpHistorialAsc(a, b) {
  const ta = new Date(a.created_at).getTime()
  const tb = new Date(b.created_at).getTime()
  if (ta !== tb) return ta - tb
  const kind = (x) => (x.tipoLinea === 'caja' ? 0 : 1)
  const k = kind(a) - kind(b)
  if (k !== 0) return k
  return String(a.id).localeCompare(String(b.id))
}

/**
 * Operaciones + movimientos de caja, orden cronológico descendente (más reciente arriba).
 * Cada línea incluye `saldoUsd` y `saldoUsdt`: saldo de caja **después** de aplicar ese evento
 * (solo movimientos de caja cambian el saldo; las operaciones muestran el saldo vigente en ese instante).
 */
export async function fetchHistorialUnificado() {
  const [opsRows, cajaRows] = await Promise.all([
    fetchAllRowsAscending('operaciones', '*, clientes(nombre, alias, telefono)'),
    fetchAllRowsAscending(
      'movimientos_caja',
      '*, operaciones(clientes(nombre, alias))',
    ),
  ])

  const operaciones = opsRows.map((row) => ({
    tipoLinea: 'operacion',
    id: row.id,
    created_at: row.created_at,
    payload: row,
  }))

  const caja = cajaRows.map((row) => ({
    tipoLinea: 'caja',
    id: row.id,
    created_at: row.created_at,
    payload: row,
  }))

  const mergedAsc = [...operaciones, ...caja].sort(cmpHistorialAsc)

  const acc = { USD: 0, USDT: 0, VES: 0 }
  const withSaldos = mergedAsc.map((line) => {
    if (line.tipoLinea === 'caja') {
      const m = line.payload
      const k = normalizeMoneda(m.moneda)
      const d = deltaMontoMovimientoCaja(m)
      if (acc[k] === undefined) acc[k] = 0
      acc[k] += d
    }
    return {
      ...line,
      saldoUsd: acc.USD ?? 0,
      saldoUsdt: acc.USDT ?? 0,
    }
  })

  return withSaldos.reverse()
}
