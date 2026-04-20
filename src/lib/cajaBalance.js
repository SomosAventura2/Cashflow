/** Normaliza código de moneda para acumulados de caja. */
export function normalizeMoneda(m) {
  if (m == null) return 'OTR'
  const u = String(m).trim().toUpperCase()
  if (u === 'VES' || u === 'BS' || u === 'BSS') return 'VES'
  if (u === 'USD') return 'USD'
  if (u === 'USDT') return 'USDT'
  return u
}

/** Delta numérico del movimiento (ingreso +, egreso −, ajuste el monto tal cual). */
export function deltaMontoMovimientoCaja(r) {
  const v = Number(r.monto) || 0
  if (r.tipo === 'ingreso') return v
  if (r.tipo === 'egreso') return -v
  if (r.tipo === 'ajuste') return v
  return 0
}
