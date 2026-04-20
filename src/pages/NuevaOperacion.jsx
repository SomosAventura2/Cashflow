import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { crearOperacion, fetchClientes } from '../features/operaciones/api.js'
import {
  armarVistaPrevia,
  calcularUsdtNetoVentaUsd,
  calcularUsdEntradaDesdeUsdtNeto,
  calcularUsdNetoCompraUsdt,
  calcularUsdtEntradaDesdeUsdNetoCompra,
} from '../lib/calculations.js'
import { useAppStore } from '../store/useAppStore'
import {
  ROUTES,
  ESTADOS_OPERACION,
  MODOS_OPERACION,
  MONEDAS_COMISION,
  MONEDAS_CAMBIO,
  etiquetaEstadoOperacion,
} from '../utils/constants'
import { formatNumber } from '../utils/format.js'
import { etiquetaCliente } from '../utils/clienteLabel.js'

const defaultForm = {
  cliente_id: '',
  modo_operacion: 'propio',
  comision_moneda: 'USD',
  tipo: 'venta',
  moneda_entrada: 'USD',
  moneda_salida: 'USDT',
  monto_entrada: '',
  monto_salida: '',
  tasa: '',
  comision_pct: '5',
  comision_fija: '0',
  estado: 'pendiente',
  /**
   * Par USD↔USDT sin comisión fija: `entrada` calcula salida; `salida` calcula entrada; `manual` ambos editables.
   * Al guardar se mapea a `cambio_auto_fijo_salida` (solo true en modo `salida`).
   */
  cambioAutoParUsdUsdt: 'entrada',
}

const labelClass = 'block text-xs font-medium uppercase tracking-wide text-zinc-500 mb-1.5 lg:break-words'
const inputClass =
  'w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/25'
const cardClass =
  'rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4'

const CICLOS_CAMBIO_AUTO = ['entrada', 'salida', 'manual']

export function NuevaOperacion() {
  const navigate = useNavigate()
  const bumpDashboard = useAppStore((s) => s.bumpDashboard)
  const [form, setForm] = useState(defaultForm)

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    document.querySelector('main')?.scrollTo?.(0, 0)
  }, [])
  const [clientes, setClientes] = useState([])
  const [loadingClientes, setLoadingClientes] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const preview = useMemo(
    () =>
      armarVistaPrevia({
        ...form,
        cambio_auto_fijo_salida: form.cambioAutoParUsdUsdt === 'salida',
      }),
    [form],
  )

  const fijoAutoEntradaLabel = form.tipo === 'venta' ? 'USD' : 'USDT'
  const fijoAutoSalidaLabel = form.tipo === 'venta' ? 'USDT' : 'USD'

  const autoCambioUsdUsdt =
    ((form.tipo === 'venta' &&
      form.moneda_entrada === 'USD' &&
      form.moneda_salida === 'USDT') ||
      (form.tipo === 'compra' &&
        form.moneda_entrada === 'USDT' &&
        form.moneda_salida === 'USD')) &&
    (Number(form.comision_fija) === 0 || form.comision_fija === '')

  const parCalcEntrada = autoCambioUsdUsdt && form.cambioAutoParUsdUsdt === 'entrada'
  const parCalcSalida = autoCambioUsdUsdt && form.cambioAutoParUsdUsdt === 'salida'
  const parMontosManual = autoCambioUsdUsdt && form.cambioAutoParUsdUsdt === 'manual'

  useEffect(() => {
    if (!autoCambioUsdUsdt || form.cambioAutoParUsdUsdt !== 'entrada') return
    if (form.tipo === 'venta') {
      const net = calcularUsdtNetoVentaUsd({
        montoUsd: form.monto_entrada,
        comisionPct: form.comision_pct,
        tasa: form.tasa,
      })
      const next = net == null ? '' : String(Math.round(net * 1e8) / 1e8)
      setForm((f) => (f.monto_salida === next ? f : { ...f, monto_salida: next }))
      return
    }
    const usd = calcularUsdNetoCompraUsdt({
      montoUsdt: form.monto_entrada,
      comisionPct: form.comision_pct,
      tasa: form.tasa,
    })
    const next = usd == null ? '' : String(Math.round(usd * 1e8) / 1e8)
    setForm((f) => (f.monto_salida === next ? f : { ...f, monto_salida: next }))
  }, [
    autoCambioUsdUsdt,
    form.cambioAutoParUsdUsdt,
    form.monto_entrada,
    form.comision_pct,
    form.comision_fija,
    form.tasa,
    form.tipo,
    form.moneda_entrada,
    form.moneda_salida,
  ])

  useEffect(() => {
    if (!autoCambioUsdUsdt || form.cambioAutoParUsdUsdt !== 'salida') return
    if (form.tipo === 'venta') {
      const usd = calcularUsdEntradaDesdeUsdtNeto({
        montoUsdtNeto: form.monto_salida,
        comisionPct: form.comision_pct,
        tasa: form.tasa,
      })
      const next = usd == null ? '' : String(Math.round(usd * 1e8) / 1e8)
      setForm((f) => (f.monto_entrada === next ? f : { ...f, monto_entrada: next }))
      return
    }
    const usdt = calcularUsdtEntradaDesdeUsdNetoCompra({
      montoUsdNeto: form.monto_salida,
      comisionPct: form.comision_pct,
      tasa: form.tasa,
    })
    const next = usdt == null ? '' : String(Math.round(usdt * 1e8) / 1e8)
    setForm((f) => (f.monto_entrada === next ? f : { ...f, monto_entrada: next }))
  }, [
    autoCambioUsdUsdt,
    form.cambioAutoParUsdUsdt,
    form.monto_salida,
    form.comision_pct,
    form.comision_fija,
    form.tasa,
    form.tipo,
    form.moneda_entrada,
    form.moneda_salida,
  ])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingClientes(true)
      try {
        const list = await fetchClientes()
        if (!cancelled) setClientes(list)
      } catch {
        if (!cancelled) setClientes([])
      } finally {
        if (!cancelled) setLoadingClientes(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function updateField(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value }
      if (field === 'tipo') {
        if (value === 'compra') {
          next.moneda_entrada = 'USDT'
          next.moneda_salida = 'USD'
        } else if (value === 'venta') {
          next.moneda_entrada = 'USD'
          next.moneda_salida = 'USDT'
        }
        next.monto_entrada = ''
        next.monto_salida = ''
        next.cambioAutoParUsdUsdt = 'entrada'
        if (f.cambioAutoParUsdUsdt === 'manual') {
          next.comision_pct = '5'
          next.comision_fija = '0'
        }
      }
      const autoPar =
        ((next.tipo === 'venta' &&
          next.moneda_entrada === 'USD' &&
          next.moneda_salida === 'USDT') ||
          (next.tipo === 'compra' &&
            next.moneda_entrada === 'USDT' &&
            next.moneda_salida === 'USD')) &&
        !(Number(next.comision_fija) > 0)
      if (
        field === 'moneda_entrada' ||
        field === 'moneda_salida' ||
        field === 'comision_fija'
      ) {
        if (!autoPar) {
          next.monto_salida = ''
          next.monto_entrada = ''
          next.cambioAutoParUsdUsdt = 'entrada'
        }
      }
      return next
    })
  }

  function toggleCambioAutoFijoSalida() {
    setForm((f) => {
      const i = CICLOS_CAMBIO_AUTO.indexOf(f.cambioAutoParUsdUsdt)
      const nextMode = CICLOS_CAMBIO_AUTO[(i < 0 ? 0 : i + 1) % CICLOS_CAMBIO_AUTO.length]
      const next = {
        ...f,
        cambioAutoParUsdUsdt: nextMode,
        monto_entrada: '',
        monto_salida: '',
      }
      if (nextMode === 'manual') {
        next.comision_pct = ''
        next.comision_fija = ''
      } else if (f.cambioAutoParUsdUsdt === 'manual') {
        next.comision_pct = f.comision_pct === '' ? '5' : f.comision_pct
        next.comision_fija = f.comision_fija === '' ? '0' : f.comision_fija
      }
      return next
    })
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!form.cliente_id) {
      setError('Debes seleccionar un cliente para guardar la operación.')
      return
    }
    const mIn = form.monto_entrada === '' ? 0 : Number(form.monto_entrada)
    const mOut = form.monto_salida === '' ? 0 : Number(form.monto_salida)
    if (!(mIn > 0)) {
      setError('Indica un monto de entrada mayor que 0.')
      return
    }
    if (!(mOut > 0)) {
      setError('El monto de salida debe ser mayor que 0 (revisa el % o la tasa).')
      return
    }
    const pct = form.comision_pct === '' ? 0 : Number(form.comision_pct)
    const autoParForm =
      ((form.tipo === 'venta' &&
        form.moneda_entrada === 'USD' &&
        form.moneda_salida === 'USDT') ||
        (form.tipo === 'compra' &&
          form.moneda_entrada === 'USDT' &&
          form.moneda_salida === 'USD')) &&
      !(Number(form.comision_fija) > 0)
    if (autoParForm && form.cambioAutoParUsdUsdt !== 'manual') {
      if (form.cambioAutoParUsdUsdt === 'salida') {
        if (!Number.isFinite(pct) || pct < 0) {
          setError('El % de comisión no es válido.')
          return
        }
      } else if (!(pct > 0 && pct < 100)) {
        setError(
          'Para el cálculo automático del segundo monto usa un % de comisión entre 0 y 100 (excl.).',
        )
        return
      }
    }
    setSaving(true)
    try {
      const esManualPar = form.cambioAutoParUsdUsdt === 'manual'
      await crearOperacion({
        cliente_id: form.cliente_id,
        modo_operacion: form.modo_operacion,
        comision_moneda: form.comision_moneda,
        tipo: form.tipo,
        moneda_entrada: form.moneda_entrada,
        moneda_salida: form.moneda_salida,
        monto_entrada: mIn,
        monto_salida: mOut,
        tasa: form.tasa === '' ? null : Number(form.tasa),
        comision_pct: esManualPar ? 0 : form.comision_pct === '' ? 0 : Number(form.comision_pct),
        comision_fija: esManualPar ? 0 : form.comision_fija === '' ? 0 : Number(form.comision_fija),
        estado: form.estado,
        observacion: null,
        cambio_auto_fijo_salida: form.cambioAutoParUsdUsdt === 'salida',
        par_montos_manual: esManualPar,
      })
      setForm({ ...defaultForm })
      bumpDashboard()
      navigate(ROUTES.home, { replace: true })
    } catch (errSubmit) {
      setError(errSubmit?.message ?? String(errSubmit))
    } finally {
      setSaving(false)
    }
  }

  const esIntermediacion = form.modo_operacion === 'intermediacion'
  const puedeGuardar = Boolean(form.cliente_id) && clientes.length > 0

  return (
    <div className="space-y-6 pb-4 lg:pb-20">
      <header>
        <h1 className="text-2xl font-semibold text-white">Nueva operación</h1>
      </header>

      <section className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <form className={`${cardClass} min-w-0 w-full flex-1 space-y-4 lg:max-w-none`} onSubmit={onSubmit}>
          <div>
            <label className={labelClass}>Cliente</label>
            <select
              className={inputClass}
              value={form.cliente_id}
              onChange={(e) => updateField('cliente_id', e.target.value)}
              disabled={loadingClientes}
              required
            >
              <option value="" disabled>
                Selecciona un cliente (obligatorio)
              </option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {etiquetaCliente(c, c.id)}
                </option>
              ))}
            </select>
            {esIntermediacion ? (
              <p className="mt-2 text-xs text-zinc-500">
                En intermediación no se generan cuentas por cobrar/pagar automáticas: el principal no
                pasa por tu caja.
              </p>
            ) : null}
            {!loadingClientes && clientes.length === 0 ? (
              <p className="mt-2 text-xs text-amber-400">
                No hay clientes. Crea uno en la pestaña Clientes antes de operar.
              </p>
            ) : null}
          </div>

          <div>
            <label className={labelClass}>Modo</label>
            <select
              className={inputClass}
              value={form.modo_operacion}
              onChange={(e) => updateField('modo_operacion', e.target.value)}
            >
              {MODOS_OPERACION.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {esIntermediacion ? (
            <div>
              <label className={labelClass}>Comisión entra en caja como</label>
              <select
                className={inputClass}
                value={form.comision_moneda}
                onChange={(e) => updateField('comision_moneda', e.target.value)}
              >
                {MONEDAS_COMISION.map((mon) => (
                  <option key={mon} value={mon}>
                    {mon}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <label className={labelClass}>Tipo</label>
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 p-1">
              <button
                type="button"
                onClick={() => updateField('tipo', 'venta')}
                className={`rounded-xl py-2.5 text-sm font-semibold capitalize transition ${
                  form.tipo === 'venta'
                    ? 'bg-orange-600 text-white shadow'
                    : 'border border-transparent bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Venta
              </button>
              <button
                type="button"
                onClick={() => updateField('tipo', 'compra')}
                className={`rounded-xl py-2.5 text-sm font-semibold capitalize transition ${
                  form.tipo === 'compra'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'border border-transparent bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Compra
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Moneda entrada</label>
              <select
                className={inputClass}
                value={form.moneda_entrada}
                onChange={(e) => updateField('moneda_entrada', e.target.value)}
                required
              >
                {MONEDAS_CAMBIO.map((mon) => (
                  <option key={mon} value={mon}>
                    {mon}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Moneda salida</label>
              <select
                className={inputClass}
                value={form.moneda_salida}
                onChange={(e) => updateField('moneda_salida', e.target.value)}
                required
              >
                {MONEDAS_CAMBIO.map((mon) => (
                  <option key={mon} value={mon}>
                    {mon}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Entrada</label>
              <input
                className={`${inputClass} ${parCalcSalida ? 'cursor-not-allowed opacity-90' : ''}`}
                type="number"
                inputMode="decimal"
                enterKeyHint="done"
                min="0"
                step="any"
                value={form.monto_entrada}
                onChange={(e) => updateField('monto_entrada', e.target.value)}
                placeholder="0"
                readOnly={parCalcSalida}
                title={
                  parCalcSalida
                    ? `Se calcula desde ${fijoAutoSalidaLabel} (salida) y % de comisión.`
                    : undefined
                }
              />
            </div>
            <div>
              <label className={labelClass}>Salida</label>
              <input
                className={`${inputClass} ${parCalcEntrada ? 'cursor-not-allowed opacity-90' : ''}`}
                type="number"
                inputMode="decimal"
                enterKeyHint="done"
                min="0"
                step="any"
                value={form.monto_salida}
                onChange={(e) => updateField('monto_salida', e.target.value)}
                placeholder="0"
                readOnly={parCalcEntrada}
                title={
                  parCalcEntrada
                    ? `Se calcula desde ${fijoAutoEntradaLabel} de entrada y % de comisión.`
                    : undefined
                }
              />
            </div>
          </div>

          {((form.tipo === 'venta' &&
            form.moneda_entrada === 'USD' &&
            form.moneda_salida === 'USDT') ||
            (form.tipo === 'compra' &&
              form.moneda_entrada === 'USDT' &&
              form.moneda_salida === 'USD')) &&
          !autoCambioUsdUsdt ? (
            <p className="text-xs text-zinc-500">
              Si usas <span className="text-zinc-400">comisión fija</span> mayor que 0, indica el monto de
              salida a mano.
            </p>
          ) : null}

          {!parMontosManual ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Comisión %</label>
                <input
                  className={inputClass}
                  type="number"
                  inputMode="decimal"
                  enterKeyHint="done"
                  min="0"
                  step="any"
                  value={form.comision_pct}
                  onChange={(e) => updateField('comision_pct', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className={labelClass}>Comisión fija</label>
                <input
                  className={inputClass}
                  type="number"
                  inputMode="decimal"
                  enterKeyHint="done"
                  min="0"
                  step="any"
                  value={form.comision_fija}
                  onChange={(e) => updateField('comision_fija', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            {!parMontosManual
              ? [
                  { label: '0%', value: '0' },
                  { label: '1%', value: '1' },
                  { label: '4%', value: '4' },
                  { label: '5%', value: '5' },
                ].map((shortcut) => (
                  <button
                    key={shortcut.label}
                    type="button"
                    onClick={() => updateField('comision_pct', shortcut.value)}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600"
                  >
                    {shortcut.label}
                  </button>
                ))
              : null}
            <button
              type="button"
              disabled={!autoCambioUsdUsdt}
              onClick={toggleCambioAutoFijoSalida}
              title={
                autoCambioUsdUsdt
                  ? form.cambioAutoParUsdUsdt === 'entrada'
                    ? `Siguiente: fijas ${fijoAutoSalidaLabel} neto y se calcula ${fijoAutoEntradaLabel} (comisión % aparte).`
                    : form.cambioAutoParUsdUsdt === 'salida'
                      ? `Siguiente: montos manuales (entrada y salida a tu criterio).`
                      : `Siguiente: calculas salida desde ${fijoAutoEntradaLabel} de entrada.`
                  : 'Solo en venta USD → USDT o compra USDT → USD sin comisión fija'
              }
              className="rounded-2xl border border-sky-600/50 bg-sky-500/10 px-3 py-2 text-sm font-medium text-sky-300 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ⇄ Calcular:{' '}
              {form.cambioAutoParUsdUsdt === 'entrada'
                ? `desde ${fijoAutoEntradaLabel}`
                : form.cambioAutoParUsdUsdt === 'salida'
                  ? `desde ${fijoAutoSalidaLabel}`
                  : 'manual'}
            </button>
          </div>

          <div>
            <label className={labelClass}>Estado</label>
            <select
              className={inputClass}
              value={form.estado}
              onChange={(e) => updateField('estado', e.target.value)}
            >
              {ESTADOS_OPERACION.map((s) => (
                <option key={s} value={s}>
                  {etiquetaEstadoOperacion(s)}
                </option>
              ))}
            </select>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={saving || !puedeGuardar}
            className="w-full rounded-2xl bg-white py-3 text-sm font-semibold text-zinc-950 disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar operación'}
          </button>
        </form>

        <aside className="w-full shrink-0 space-y-4 lg:sticky lg:top-4 lg:w-96 lg:max-w-full">
          <div className={`${cardClass} border-emerald-500/25 bg-emerald-500/5`}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
              Vista previa
            </div>
            <div className="mt-2 text-lg font-semibold text-white">Resultado automático</div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-zinc-500">Monto salida</div>
                <div className="mt-1 font-semibold text-zinc-100">
                  {formatNumber(preview.montoSalida)}
                </div>
              </div>
              <div>
                <div className="text-zinc-500">Monto entrada</div>
                <div className="mt-1 font-semibold text-zinc-100">
                  {formatNumber(preview.montoEntrada)}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-zinc-500">
                  {esIntermediacion ? 'Lo que entra a tu caja (solo comisión)' : 'Profit'}
                </div>
                <div className="mt-1 text-lg font-semibold text-emerald-400">
                  {formatNumber(preview.ganancia)}
                  {esIntermediacion ? ` ${form.comision_moneda}` : ''}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}
