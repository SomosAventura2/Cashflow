export const ROUTES = {
  home: '/',
  login: '/login',
  operar: '/operar',
  operaciones: '/operaciones',
  clientes: '/clientes',
  deudas: '/deudas',
  caja: '/caja',
  reportes: '/reportes',
}

export const ESTADOS_OPERACION = ['pendiente', 'cerrada']

/** Listados: filas antiguas con estado `parcial` se muestran como pendiente. */
export function etiquetaEstadoOperacion(estado) {
  const e = String(estado ?? '').toLowerCase()
  const norm = e === 'parcial' ? 'pendiente' : e
  if (!norm) return '—'
  return norm.charAt(0).toUpperCase() + norm.slice(1)
}

export const TIPOS_OPERACION = ['compra', 'venta']

/** propio: principal en caja. intermediacion: solo comisión en caja (opción A). */
export const MODOS_OPERACION = [
  { value: 'propio', label: 'Con mi capital' },
  { value: 'intermediacion', label: 'Intermediación (solo comisión)' },
]

/** Solo USD y USDT en operaciones y comisión. */
export const MONEDAS_CAMBIO = ['USD', 'USDT']

export const MONEDAS_COMISION = MONEDAS_CAMBIO

/** Agrupación temporal en la pantalla Reportes. */
export const REPORTE_PERIODO = /** @type {const} */ ({
  semanal: 'semanal',
  quincenal: 'quincenal',
  mensual: 'mensual',
  todo: 'todo',
})

/** Opciones UI: valor + etiqueta. */
export const REPORTE_PERIODO_OPCIONES = [
  { value: REPORTE_PERIODO.semanal, label: 'Semanal' },
  { value: REPORTE_PERIODO.quincenal, label: 'Quincenal' },
  { value: REPORTE_PERIODO.mensual, label: 'Mensual' },
  { value: REPORTE_PERIODO.todo, label: 'Todo' },
]
