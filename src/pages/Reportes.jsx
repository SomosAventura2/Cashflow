import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchReportesResumen, resumenReporteDesdeFilas } from '../features/reportes/api.js'
import { Card } from '../components/Card'
import { formatNumber } from '../utils/format'
import { useAppStore } from '../store/useAppStore'
import { REPORTE_PERIODO, REPORTE_PERIODO_OPCIONES } from '../utils/constants'

const labelClass = 'text-xs font-medium uppercase tracking-wide text-zinc-500'
const cellNum = 'text-right font-medium text-zinc-100 tabular-nums'

const toggleBtn =
  'rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm'

function GraficoVolumenUsd({ periodos }) {
  const serie = useMemo(() => [...periodos].reverse(), [periodos])
  const w = 340
  const h = 112
  const padX = 10
  const padY = 10
  if (serie.length === 0) {
    return <p className="text-sm text-zinc-500">Sin datos para graficar.</p>
  }
  const vals = serie.map((p) => Number(p.volumenUsd) || 0)
  const maxV = Math.max(...vals, 1)
  const n = serie.length
  const coords = vals.map((v, i) => {
    const x = n === 1 ? padX + (w - padX * 2) / 2 : padX + (i / (n - 1)) * (w - padX * 2)
    const y = padY + (1 - v / maxV) * (h - padY * 2)
    return { x, y }
  })
  const pts = coords.map((p) => `${p.x},${p.y}`).join(' ')
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-28 w-full text-sky-400"
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
    </svg>
  )
}

function tituloCierres(timeframe) {
  switch (timeframe) {
    case REPORTE_PERIODO.quincenal:
      return 'Cierres quincenales'
    case REPORTE_PERIODO.mensual:
      return 'Cierres mensuales'
    case REPORTE_PERIODO.todo:
      return 'Totales agregados'
    default:
      return 'Cierres semanales'
  }
}

function etiquetaColumnaPeriodo(timeframe) {
  switch (timeframe) {
    case REPORTE_PERIODO.quincenal:
      return 'Quincena'
    case REPORTE_PERIODO.mensual:
      return 'Mes'
    case REPORTE_PERIODO.todo:
      return 'Alcance'
    default:
      return 'Semana'
  }
}

export function Reportes() {
  const dashboardNonce = useAppStore((s) => s.dashboardNonce)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [payload, setPayload] = useState(null)
  const [timeframe, setTimeframe] = useState(REPORTE_PERIODO.semanal)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { error: err, data } = await fetchReportesResumen()
    if (err) {
      setError(err)
      setPayload(null)
    } else {
      setPayload(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      load()
    })
    return () => cancelAnimationFrame(id)
  }, [load, dashboardNonce])

  const d = useMemo(() => {
    if (!payload?.rows) return null
    const agg = resumenReporteDesdeFilas(payload.rows, timeframe)
    return {
      ...agg,
      totalClientes: payload.totalClientes,
      errorClientes: payload.errorClientes,
    }
  }, [payload, timeframe])

  return (
    <div className="space-y-4 pb-2">
      <header>
        <h1 className="text-2xl font-semibold text-white">Reportes</h1>
      </header>

      {error ? (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-8 text-center text-sm text-zinc-500">
          Cargando reportes…
        </div>
      ) : d ? (
        <>
          <div className="grid grid-cols-1 gap-3">
            <Card title="Operaciones totales">
              <p className="text-3xl font-bold text-zinc-100">{formatNumber(d.totalOperaciones)}</p>
            </Card>
            <Card title="Ganancia acumulada">
              <p className="text-3xl font-bold text-emerald-400">{formatNumber(d.gananciaTotal)}</p>
            </Card>
          </div>

          <Card title="Clientes">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className={labelClass}>En sistema</div>
                <p className="mt-1 text-2xl font-semibold text-zinc-100">
                  {d.totalClientes != null ? formatNumber(d.totalClientes) : '—'}
                </p>
                {d.errorClientes ? (
                  <p className="mt-1 text-xs text-amber-400">{d.errorClientes}</p>
                ) : null}
              </div>
              <div>
                <div className={labelClass}>Con al menos una operación</div>
                <p className="mt-1 text-2xl font-semibold text-sky-300">
                  {formatNumber(d.clientesConOperacion)}
                </p>
              </div>
            </div>
          </Card>

          <Card title="Operaciones — desglose">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <div className={labelClass}>Por tipo</div>
                <ul className="mt-2 space-y-1.5 text-sm text-zinc-300">
                  <li className="flex justify-between gap-2">
                    <span>Venta</span>
                    <span className="tabular-nums text-zinc-100">{formatNumber(d.porTipo.venta)}</span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span>Compra</span>
                    <span className="tabular-nums text-zinc-100">{formatNumber(d.porTipo.compra)}</span>
                  </li>
                  {d.porTipo.otro > 0 ? (
                    <li className="flex justify-between gap-2">
                      <span>Otro</span>
                      <span className="tabular-nums text-zinc-100">{formatNumber(d.porTipo.otro)}</span>
                    </li>
                  ) : null}
                </ul>
              </div>
              <div>
                <div className={labelClass}>Por estado</div>
                <ul className="mt-2 space-y-1.5 text-sm text-zinc-300">
                  <li className="flex justify-between gap-2">
                    <span>Pendiente</span>
                    <span className="tabular-nums text-zinc-100">
                      {formatNumber(d.porEstado.pendiente)}
                    </span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span>Cerrada</span>
                    <span className="tabular-nums text-zinc-100">
                      {formatNumber(d.porEstado.cerrada)}
                    </span>
                  </li>
                  {d.porEstado.otro > 0 ? (
                    <li className="flex justify-between gap-2">
                      <span>Otro</span>
                      <span className="tabular-nums text-zinc-100">{formatNumber(d.porEstado.otro)}</span>
                    </li>
                  ) : null}
                </ul>
              </div>
              <div>
                <div className={labelClass}>Por modo</div>
                <ul className="mt-2 space-y-1.5 text-sm text-zinc-300">
                  <li className="flex justify-between gap-2">
                    <span>Propio</span>
                    <span className="tabular-nums text-zinc-100">{formatNumber(d.opsPropias)}</span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span>Intermediación</span>
                    <span className="tabular-nums text-zinc-100">{formatNumber(d.opsInter)}</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          <Card title={tituloCierres(timeframe)}>
            <div className="mb-4 flex flex-wrap gap-2">
              <span className={`${labelClass} mr-1 w-full sm:mr-2 sm:w-auto sm:self-center`}>Agrupar por</span>
              <div className="flex flex-wrap gap-1.5">
                {REPORTE_PERIODO_OPCIONES.map((opt) => {
                  const active = timeframe === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTimeframe(opt.value)}
                      className={`${toggleBtn} ${
                        active
                          ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200'
                          : 'border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-900/80'
                      }`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
            {d.periodos.length === 0 ? (
              <p className="text-sm text-zinc-500">Aún no hay operaciones para agrupar.</p>
            ) : (
              <>
                <div className="mb-4 rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-3">
                  <div className={labelClass}>Volumen en USD por periodo</div>
                  <GraficoVolumenUsd periodos={d.periodos} />
                </div>
                <div className="overflow-x-auto">
                <table className="w-full min-w-[320px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                      <th className="pb-2 pr-2 font-medium">{etiquetaColumnaPeriodo(timeframe)}</th>
                      <th className={`pb-2 pr-2 font-medium ${cellNum}`}>Ops</th>
                      <th className={`pb-2 pr-2 font-medium ${cellNum}`}>Ventas</th>
                      <th className={`pb-2 pr-2 font-medium ${cellNum}`}>Compras</th>
                      <th className={`pb-2 font-medium ${cellNum}`}>Σ ganancia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {d.periodos.map((s) => (
                      <tr key={s.periodKey} className="text-zinc-300">
                        <td className="py-2.5 pr-2 text-zinc-200">{s.etiqueta}</td>
                        <td className={`py-2.5 pr-2 ${cellNum}`}>{formatNumber(s.count)}</td>
                        <td className={`py-2.5 pr-2 ${cellNum}`}>{formatNumber(s.ventas)}</td>
                        <td className={`py-2.5 pr-2 ${cellNum}`}>{formatNumber(s.compras)}</td>
                        <td className={`py-2.5 ${cellNum} text-emerald-300`}>
                          {formatNumber(s.ganancia)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </Card>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card title="Top clientes por ganancia">
              {d.topClientesGanancia.length === 0 ? (
                <p className="text-sm text-zinc-500">Sin operaciones con cliente asignado.</p>
              ) : (
                <ol className="space-y-2 text-sm">
                  {d.topClientesGanancia.map((c, i) => (
                    <li
                      key={c.cliente_id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-3 py-2"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="text-xs text-zinc-500">{i + 1}. </span>
                        <span className="font-medium text-zinc-200">{c.nombre}</span>
                        <span className="ml-2 text-xs text-zinc-500">{formatNumber(c.ops)} ops</span>
                      </span>
                      <span className="shrink-0 font-semibold text-emerald-400 tabular-nums">
                        {formatNumber(c.ganancia)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
            <Card title="Top clientes por volumen">
              {d.topClientesOps.length === 0 ? (
                <p className="text-sm text-zinc-500">Sin operaciones con cliente asignado.</p>
              ) : (
                <ol className="space-y-2 text-sm">
                  {d.topClientesOps.map((c, i) => (
                    <li
                      key={`${c.cliente_id}-ops`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-3 py-2"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="text-xs text-zinc-500">{i + 1}. </span>
                        <span className="font-medium text-zinc-200">{c.nombre}</span>
                      </span>
                      <span className="shrink-0 font-semibold text-sky-300 tabular-nums">
                        {formatNumber(c.ops)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
        </>
      ) : null}
    </div>
  )
}
