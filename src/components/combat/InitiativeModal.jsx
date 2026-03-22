import { useState, useEffect } from 'react'
import { rollInitiative } from '../../utils/combatUtils'

export function InitiativeModal({ combatants, onConfirm, onClose }) {
  // Pre-calculate rolls on mount (or when user clicks Reroll)
  const buildRolls = () => {
    const map = {}
    combatants.forEach((c) => {
      if (c.type === 'monster' || c.type === 'quick') {
        map[c.id] = rollInitiative(c.statblock)
      } else {
        // PC: keep existing initiative or blank
        map[c.id] = c.initiative ?? ''
      }
    })
    return map
  }

  const [values, setValues] = useState(buildRolls)

  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const handleConfirm = () => {
    const map = {}
    Object.entries(values).forEach(([id, v]) => {
      const n = parseInt(v, 10)
      if (!isNaN(n)) map[id] = n
    })
    onConfirm(map)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-600 rounded-lg shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <h2 className="font-display text-sm uppercase tracking-widest text-gold-400">
              Roll Initiative
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">Edit any value before confirming</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setValues(buildRolls())}
              className="text-xs text-slate-400 hover:text-slate-200 border border-slate-600 hover:border-slate-500 rounded px-2.5 py-1 transition-colors"
            >
              Reroll All
            </button>
            <button
              className="text-slate-500 hover:text-slate-300 text-lg leading-none"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Rows */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-800">
          {combatants.map((c) => (
            <div key={c.id} className="flex items-center px-5 py-3 gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-200 font-body truncate">{c.name}</span>
                  {c.type === 'pc' && (
                    <span className="text-[10px] bg-blue-900/60 text-blue-300 px-1.5 rounded uppercase tracking-wide">
                      PC
                    </span>
                  )}
                </div>
                {(c.type === 'monster') && c.statblock && (
                  <span className="text-xs text-slate-500">
                    {c.statblock.InitiativeModifier !== undefined
                      ? `Init ${c.statblock.InitiativeModifier >= 0 ? '+' : ''}${c.statblock.InitiativeModifier}`
                      : `Dex ${c.statblock.Abilities?.Dex ?? '?'}`}
                  </span>
                )}
              </div>
              <input
                type="number"
                value={values[c.id] ?? ''}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [c.id]: e.target.value }))
                }
                placeholder={c.type === 'pc' ? '—' : '0'}
                className="w-16 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-center font-mono text-sm text-slate-100 focus:outline-none focus:border-gold-500"
              />
            </div>
          ))}
          {combatants.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-6">No combatants to roll for.</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-700">
          <button
            onClick={handleConfirm}
            className="w-full bg-gold-500 hover:bg-gold-400 text-slate-950 font-semibold rounded px-4 py-2.5 transition-colors font-display text-sm uppercase tracking-widest"
          >
            Confirm & Sort
          </button>
        </div>
      </div>
    </div>
  )
}
