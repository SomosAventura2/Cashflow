import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/Card'
import { formatMoney, formatNumber } from '../utils/format'
import { ROUTES, etiquetaEstadoOperacion } from '../utils/constants'
import { fetchDashboard } from '../features/dashboard/api.js'
import { useAppStore } from '../store/useAppStore'

export function Dashboard() {
  const dashboardNonce = useAppStore((s) => s.dashboardNonce)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [d, setD] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      const { error: errMsg, data } = await fetchDashboard()
      if (cancelled) return
      if (errMsg) {
        setError(errMsg)
        setD(null)
      } else {
        setD(data)
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [dashboardNonce])

  const rows = d?.rows ?? []

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-white">CashFlow USDT</h1>
        <p className="text-sm text-zinc-500">
          Ganancia, caja estimada por movimientos, por cobrar y pendientes
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {error}. Revisa `.env`, RLS y el SQL en Supabase.
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-8 text-center text-sm text-zinc-500">
          Cargando dashboard…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <Card title="Ganancia hoy" className="min-w-0 p-3 sm:p-4">
              {d?.errorDia ? (
                <p className="text-xs text-amber-400">{d.errorDia}</p>
              ) : (
                <p className="text-lg font-semibold leading-tight text-emerald-400 sm:text-2xl">
                  {formatMoney(d?.gananciaDia ?? 0, 'USD')}
                </p>
              )}
            </Card>
            <Card title="Ganancia (últ. 8 ops)" className="min-w-0 p-3 sm:p-4">
              <p className="text-lg font-semibold leading-tight text-zinc-100 sm:text-2xl">
                {formatMoney(d?.totGananciaUltimas ?? 0, 'USD')}
              </p>
            </Card>
          </div>

          <Card title="Caja (por movimientos)" className="p-3 sm:p-4">
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="min-w-0 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">USD</p>
                <p className="mt-1 truncate text-xs font-semibold tabular-nums text-sky-300 sm:text-lg">
                  {formatMoney(d?.cajaUsd ?? 0, 'USD')}
                </p>
              </div>
              <div className="min-w-0 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">USDT</p>
                <p className="mt-1 truncate text-xs font-semibold tabular-nums text-sky-300 sm:text-lg">
                  {formatMoney(d?.cajaUsdt ?? 0, 'USDT')}
                </p>
              </div>
              <div className="min-w-0 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Total</p>
                <p className="mt-1 truncate text-xs font-semibold tabular-nums text-sky-200 sm:text-lg">
                  {formatNumber(d?.cajaUsdUsdtNominal ?? 0)}
                </p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <Card title="Por cobrar (&gt; 0)" className="min-w-0 p-3 sm:p-4">
              {d?.errorCobrar ? (
                <p className="text-xs text-amber-400">{d.errorCobrar}</p>
              ) : (
                <p className="text-xl font-semibold leading-tight text-amber-300 sm:text-2xl">
                  {formatNumber(d?.totalPorCobrar ?? 0)}
                </p>
              )}
            </Card>
            <Card title="Ops pendientes" className="min-w-0 p-3 sm:p-4">
              {d?.errorOpsPend ? (
                <p className="text-xs text-amber-400">{d.errorOpsPend}</p>
              ) : (
                <p className="text-3xl font-bold leading-none text-zinc-100 sm:text-4xl">
                  {d?.opsPendientes ?? 0}
                </p>
              )}
            </Card>
          </div>

          <Card title="Últimas operaciones">
            {rows.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No hay datos todavía.{' '}
                <Link className="text-emerald-400 underline" to={ROUTES.operar}>
                  Crear operación
                </Link>
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {rows.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-2 border-b border-zinc-800/80 py-2 last:border-0"
                  >
                    <span className="capitalize text-zinc-300">{r.tipo}</span>
                    <span className="text-xs text-zinc-500">{etiquetaEstadoOperacion(r.estado)}</span>
                    <span className="font-medium text-emerald-300">
                      {formatMoney(
                        r.ganancia,
                        r.modo_operacion === 'intermediacion' && r.comision_moneda
                          ? r.comision_moneda
                          : 'USD',
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              to={ROUTES.operar}
              className="block rounded-xl bg-emerald-600 py-3 text-center text-sm font-medium text-white shadow hover:bg-emerald-500"
            >
              Nueva operación
            </Link>
            <Link
              to={ROUTES.deudas}
              className="block rounded-xl border border-zinc-700 py-3 text-center text-sm font-medium text-zinc-200 hover:bg-zinc-900"
            >
              Deudas y abonos
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
