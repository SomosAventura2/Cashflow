import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchHistorialUnificado } from '../features/historial/api.js'
import { Card } from '../components/Card'
import { formatMoney, formatDateTime } from '../utils/format'
import { ROUTES } from '../utils/constants'
import { useAppStore } from '../store/useAppStore'

export function Historial() {
  const dashboardNonce = useAppStore((s) => s.dashboardNonce)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lines, setLines] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchHistorialUnificado()
      setLines(data)
    } catch (e) {
      setError(e?.message ?? String(e))
      setLines([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, dashboardNonce])

  return (
    <div className="space-y-4 pb-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-white">Historial</h1>
          <p className="text-sm text-zinc-500">
            Operaciones y movimientos de caja (ingresos / egresos) con fecha y hora.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => load()}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-900"
          >
            Actualizar
          </button>
          <Link
            to={ROUTES.operar}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
          >
            + Operar
          </Link>
        </div>
      </header>

      <Card>
        {loading ? (
          <p className="text-sm text-zinc-500">Cargando…</p>
        ) : error ? (
          <p className="text-sm text-amber-400">{error}</p>
        ) : lines.length === 0 ? (
          <p className="text-sm text-zinc-500">Sin registros.</p>
        ) : (
          <ul className="divide-y divide-zinc-800 text-sm">
            {lines.map((line) => {
              if (line.tipoLinea === 'operacion') {
                const r = line.payload
                const c = r.clientes
                const nombre = [c?.nombre, c?.alias].filter(Boolean).join(' · ') || '—'
                return (
                  <li key={`op-${r.id}`} className="flex flex-col gap-1 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-sky-300">Operación</span>
                      <span className="text-xs text-zinc-500">{formatDateTime(line.created_at)}</span>
                    </div>
                    <div className="text-xs text-zinc-400">
                      <span className="capitalize text-zinc-200">{r.tipo}</span>
                      {r.modo_operacion === 'intermediacion' ? (
                        <span className="ml-2 rounded border border-sky-600/40 px-1.5 py-0.5 text-[10px] uppercase text-sky-400">
                          Intermediación
                        </span>
                      ) : null}
                      {' · '}
                      {nombre}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
                      <span>
                        Entrada {r.moneda_entrada}: {formatMoney(r.monto_entrada, r.moneda_entrada)}
                      </span>
                      <span>
                        Salida {r.moneda_salida}: {formatMoney(r.monto_salida, r.moneda_salida)}
                      </span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 text-xs">
                      <span className="text-zinc-500">Estado: {r.estado}</span>
                      <span className="text-emerald-400">
                        Ganancia{' '}
                        {formatMoney(
                          r.ganancia,
                          r.modo_operacion === 'intermediacion' && r.comision_moneda
                            ? r.comision_moneda
                            : 'USD',
                        )}
                      </span>
                    </div>
                  </li>
                )
              }

              const m = line.payload
              const opCli = m.operaciones?.clientes
              const nombreOp = [opCli?.nombre, opCli?.alias].filter(Boolean).join(' · ')
              const esManual = m.operacion_id == null
              const colorClass =
                m.tipo === 'egreso'
                  ? 'text-red-300'
                  : m.tipo === 'ajuste'
                    ? 'text-amber-300'
                    : 'text-emerald-300'

              return (
                <li key={`caja-${m.id}`} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-zinc-200">Caja</span>
                        <span className="capitalize text-zinc-400">{m.tipo}</span>
                        <span className="text-zinc-500">{m.moneda}</span>
                        {esManual ? (
                          <span className="rounded-full border border-zinc-600 px-2 py-0.5 text-[10px] font-medium uppercase text-zinc-400">
                            Manual
                          </span>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-xs text-zinc-500">{formatDateTime(line.created_at)}</span>
                    </div>
                    {m.nota ? (
                      <p className="mt-1 text-xs text-zinc-500">{m.nota}</p>
                    ) : null}
                    {!esManual && nombreOp ? (
                      <p className="mt-0.5 text-xs text-zinc-600">Cliente (operación): {nombreOp}</p>
                    ) : null}
                  </div>
                  <span className={`shrink-0 font-medium tabular-nums ${colorClass}`}>
                    {formatMoney(m.monto, m.moneda)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
