import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * Bloque compacto con cabecera clic y contenido desplegable.
 */
export function CollapseCard({ title, subtitle, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-zinc-800/40"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <div className="text-sm font-semibold text-zinc-100">{title}</div>
          {subtitle ? <div className="mt-0.5 text-xs text-zinc-500">{subtitle}</div> : null}
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>
      {open ? <div className="border-t border-zinc-800 px-4 pb-4 pt-1">{children}</div> : null}
    </div>
  )
}
