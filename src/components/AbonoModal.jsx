import { formatNumber } from '../utils/format'

function montoDesdeSaldo(saldo, fraccion) {
  const s = Number(saldo)
  if (!Number.isFinite(s) || s <= 0) return ''
  const raw = fraccion === 1 ? s : s * 0.5
  return String(Math.round(raw * 1e8) / 1e8)
}

export function AbonoModal({
  open,
  onClose,
  onSubmit,
  deuda,
  kind,
  amount,
  setAmount,
  monedaMovimiento,
  setMonedaMovimiento,
  saving,
}) {
  if (!open) return null

  const titulo = kind === 'cobrar' ? 'Registrar cobro' : 'Registrar pago'
  const monedaCuenta = deuda?.moneda ?? '—'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="abono-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
        <h2 id="abono-title" className="text-lg font-semibold text-white">
          {titulo}
        </h2>
        {deuda ? (
          <>
            <p className="mt-2 text-sm text-zinc-400">
              Saldo pendiente:{' '}
              <span className="font-medium text-zinc-100">
                {formatNumber(deuda.saldo ?? 0)} {monedaCuenta}
              </span>
            </p>
          </>
        ) : null}

        <span className="mt-4 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          {kind === 'cobrar' ? 'Moneda del cobro en caja' : 'Moneda del pago en caja'}
        </span>
        <div className="mt-1.5 grid grid-cols-2 gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 p-1">
          <button
            type="button"
            disabled={saving || !deuda}
            onClick={() => setMonedaMovimiento('USD')}
            className={`rounded-xl py-2.5 text-sm font-semibold transition ${
              monedaMovimiento === 'USD'
                ? 'bg-sky-600 text-white shadow'
                : 'border border-transparent bg-zinc-950 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            USD
          </button>
          <button
            type="button"
            disabled={saving || !deuda}
            onClick={() => setMonedaMovimiento('USDT')}
            className={`rounded-xl py-2.5 text-sm font-semibold transition ${
              monedaMovimiento === 'USDT'
                ? 'bg-emerald-600 text-white shadow'
                : 'border border-transparent bg-zinc-950 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            USDT
          </button>
        </div>

        <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Monto del abono
        </label>
        <input
          type="number"
          inputMode="decimal"
          enterKeyHint="done"
          min="0"
          step="any"
          className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-zinc-100 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/25"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          disabled={saving}
        />

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={saving || !deuda || !(Number(deuda.saldo) > 0)}
            onClick={() => setAmount(montoDesdeSaldo(deuda.saldo, 0.5))}
            className="rounded-xl border border-zinc-800 bg-zinc-950 py-2 text-sm font-medium text-zinc-300 hover:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            50%
          </button>
          <button
            type="button"
            disabled={saving || !deuda || !(Number(deuda.saldo) > 0)}
            onClick={() => setAmount(montoDesdeSaldo(deuda.saldo, 1))}
            className="rounded-xl border border-zinc-800 bg-zinc-950 py-2 text-sm font-medium text-zinc-300 hover:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            100%
          </button>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-900"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
            onClick={onSubmit}
            disabled={saving || !deuda}
          >
            {saving ? 'Guardando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
