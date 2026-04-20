import { useCallback, useEffect, useState } from 'react'
import { fetchHistorialUnificado } from '../features/historial/api.js'
import { Card } from './Card'
import { formatDateTime, formatDecimal, formatNumber } from '../utils/format'
import { etiquetaCliente } from '../utils/clienteLabel.js'
import { useAppStore } from '../store/useAppStore'
import { etiquetaEstadoOperacion } from '../utils/constants'

/**
 * Lista unificada operaciones + movimientos de caja con saldos USD/USDT tras cada evento.
 */
export function HistorialCajaList({ cardTitle = null, showRefresh = false }) {
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
    <Card title={cardTitle}>
      {showRefresh ? (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => load()}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-900"
          >
            Actualizar
          </button>
        </div>
      ) : null}
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
              const nombre = etiquetaCliente(c)
              return (
                <li key={`op-${r.id}`} className="flex flex-col gap-1 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex flex-wrap items-center gap-2 font-medium capitalize text-zinc-200">
                      {r.tipo}
                      {r.modo_operacion === 'intermediacion' ? (
                        <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-300">
                          Intermediación
                        </span>
                      ) : null}
                    </span>
                    <span className="text-xs text-zinc-500">{formatDateTime(line.created_at)}</span>
                  </div>
                  <div className="text-xs text-zinc-500">Cliente: {nombre}</div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400">
                    <span>
                      {r.moneda_entrada}: {formatDecimal(r.monto_entrada)}
                    </span>
                    <span>
                      {r.moneda_salida}: {formatDecimal(r.monto_salida)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">{etiquetaEstadoOperacion(r.estado)}</span>
                    <span className="font-medium tabular-nums text-emerald-300">
                      Profit {formatDecimal(r.ganancia)}
                    </span>
                  </div>
                  <div className="mt-1 rounded-lg border border-zinc-800/80 bg-zinc-950/60 px-2 py-1.5 text-[11px] text-zinc-400">
                    Saldo:{' '}
                    <span className="font-medium text-zinc-200">
                      {formatNumber(line.saldoUsd, 2)} USD
                    </span>
                    {' · '}
                    <span className="font-medium text-zinc-200">
                      {formatNumber(line.saldoUsdt, 2)} USDT
                    </span>
                  </div>
                </li>
              )
            }

            const m = line.payload
            const opCli = m.operaciones?.clientes
            const nombreOp = etiquetaCliente(opCli)
            const esManual = m.operacion_id == null
            const colorClass =
              m.tipo === 'egreso'
                ? 'text-red-300'
                : m.tipo === 'ajuste'
                  ? 'text-amber-300'
                  : 'text-emerald-300'

            const tipoMovLabel =
              m.tipo === 'egreso' ? 'Egreso' : m.tipo === 'ajuste' ? 'Ajuste' : 'Ingreso'

            return (
              <li key={`caja-${m.id}`} className="flex flex-col gap-1 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex flex-wrap items-center gap-2 font-medium text-zinc-200">
                    Caja
                    {esManual ? (
                      <span className="rounded-full border border-zinc-600 px-2 py-0.5 text-[10px] font-medium uppercase text-zinc-400">
                        Manual
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs text-zinc-500">{formatDateTime(line.created_at)}</span>
                </div>
                {!esManual && nombreOp ? (
                  <div className="text-xs text-zinc-500">Cliente: {nombreOp}</div>
                ) : null}
                {m.nota ? <p className="text-xs text-zinc-500">{m.nota}</p> : null}
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400">
                  <span>
                    {m.moneda}: {formatDecimal(m.monto)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">{tipoMovLabel}</span>
                  <span className={`font-medium tabular-nums ${colorClass}`}>
                    {formatDecimal(m.monto)}
                  </span>
                </div>
                <div className="mt-1 rounded-lg border border-zinc-800/80 bg-zinc-950/60 px-2 py-1.5 text-[11px] text-zinc-400">
                  Saldo:{' '}
                  <span className="font-medium text-zinc-200">
                    {formatNumber(line.saldoUsd, 2)} USD
                  </span>
                  {' · '}
                  <span className="font-medium text-zinc-200">
                    {formatNumber(line.saldoUsdt, 2)} USDT
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
