/**
 * Texto para listados y selects: **solo alias** si existe; si no, nombre (campo único en BD).
 * @param {{ nombre?: string|null, alias?: string|null }|null|undefined} c
 * @param {string|null} [fallback] — p. ej. `id` en opciones de select
 */
export function etiquetaCliente(c, fallback = null) {
  if (!c) return fallback != null ? String(fallback) : '—'
  const alias = String(c.alias ?? '').trim()
  if (alias) return alias
  const nombre = String(c.nombre ?? '').trim()
  if (nombre) return nombre
  return fallback != null ? String(fallback) : '—'
}
