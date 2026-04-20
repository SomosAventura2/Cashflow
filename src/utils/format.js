export function formatMoney(value, moneda = 'USD') {
  const n = Number(value)
  if (Number.isNaN(n)) return '—'
  if (moneda === 'USDT') {
    return `${n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`
  }
  try {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: moneda === 'VES' || moneda === 'Bs' ? 'VES' : 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n)
  } catch {
    return `${n.toFixed(2)} ${moneda}`
  }
}

/** Montos con 2 decimales en es-VE, sin texto de moneda (el card ya indica USD/USDT). */
export function formatDecimal(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Número legible sin símbolo de moneda (montos: máx. 2 decimales por defecto). */
export function formatNumber(value, maxFrac = 2) {
  const n = Number(value)
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: maxFrac })
}

export function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** Fecha y hora local (historial, movimientos). */
export function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
