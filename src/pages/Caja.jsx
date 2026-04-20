import { useState } from 'react'
import { CollapseCard } from '../components/CollapseCard.jsx'
import { HistorialCajaList } from '../components/HistorialCajaList.jsx'
import { Input } from '../components/Input'
import { MONEDAS_CAMBIO } from '../utils/constants'
import { registrarMovimientoManual } from '../features/caja/api.js'
import { useAppStore } from '../store/useAppStore'

const inputClass =
  'w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/25'

const emptyManual = {
  tipo_movimiento: 'ingreso',
  moneda: 'USD',
  monto: '',
  nota: '',
}

export function Caja() {
  const bumpDashboard = useAppStore((s) => s.bumpDashboard)
  const [manual, setManual] = useState(emptyManual)
  const [saving, setSaving] = useState(false)
  const [manualError, setManualError] = useState(null)

  function updateManual(field, value) {
    setManual((m) => ({ ...m, [field]: value }))
  }

  async function onSubmitManual(e) {
    e.preventDefault()
    setManualError(null)
    setSaving(true)
    try {
      await registrarMovimientoManual({
        tipo: manual.tipo_movimiento,
        moneda: manual.moneda,
        monto: manual.monto === '' ? 0 : Number(manual.monto),
        nota: manual.nota,
      })
      setManual({ ...emptyManual })
      bumpDashboard()
    } catch (err) {
      setManualError(err?.message ?? String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 pb-4">
      <header>
        <h1 className="text-2xl font-semibold text-white">Caja</h1>
      </header>

      <CollapseCard title="Ajuste manual">
        <form className="space-y-3" onSubmit={onSubmitManual}>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Tipo
            </label>
            <select
              className={inputClass}
              value={manual.tipo_movimiento}
              onChange={(e) => updateManual('tipo_movimiento', e.target.value)}
            >
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Moneda
              </label>
              <select
                className={inputClass}
                value={manual.moneda}
                onChange={(e) => updateManual('moneda', e.target.value)}
              >
                {MONEDAS_CAMBIO.map((mon) => (
                  <option key={mon} value={mon}>
                    {mon}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Monto"
              type="number"
              min="0"
              step="any"
              value={manual.monto}
              onChange={(e) => updateManual('monto', e.target.value)}
              placeholder="0"
              className="gap-1.5"
            />
          </div>
          <Input
            label="Concepto (opcional)"
            value={manual.nota}
            onChange={(e) => updateManual('nota', e.target.value)}
            placeholder="Ej.: gasto oficina, capital aportado, retiro personal…"
            className="gap-1.5"
          />
          {manualError ? (
            <p className="text-sm text-red-400">{manualError}</p>
          ) : null}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Registrar movimiento'}
          </button>
        </form>
      </CollapseCard>

      <HistorialCajaList cardTitle="Historial (caja y operaciones)" showRefresh />
    </div>
  )
}
