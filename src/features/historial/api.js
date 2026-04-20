import { supabase } from '../../lib/supabase.js'

/**
 * Operaciones y movimientos de caja para historial unificado (orden cronológico descendente).
 */
export async function fetchHistorialUnificado({
  limitOperaciones = 200,
  limitCaja = 250,
} = {}) {
  const [opsRes, cajaRes] = await Promise.all([
    supabase
      .from('operaciones')
      .select('*, clientes(nombre, alias, telefono)')
      .order('created_at', { ascending: false })
      .limit(limitOperaciones),
    supabase
      .from('movimientos_caja')
      .select('*, operaciones(clientes(nombre, alias))')
      .order('created_at', { ascending: false })
      .limit(limitCaja),
  ])

  if (opsRes.error) throw opsRes.error
  if (cajaRes.error) throw cajaRes.error

  const operaciones = (opsRes.data ?? []).map((row) => ({
    tipoLinea: 'operacion',
    id: row.id,
    created_at: row.created_at,
    payload: row,
  }))

  const caja = (cajaRes.data ?? []).map((row) => ({
    tipoLinea: 'caja',
    id: row.id,
    created_at: row.created_at,
    payload: row,
  }))

  const merged = [...operaciones, ...caja].sort((a, b) => {
    const ta = new Date(a.created_at).getTime()
    const tb = new Date(b.created_at).getTime()
    return tb - ta
  })

  return merged
}
