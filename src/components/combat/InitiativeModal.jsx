import { useState, useEffect } from 'react'
import { rollInitiative } from '../../utils/combatUtils'

export function InitiativeModal({ combatants, onConfirm, onClose }) {
  const buildRolls = () => {
    const map = {}
    combatants.forEach((c) => {
      if (c.type === 'monster' || c.type === 'quick') {
        map[c.id] = rollInitiative(c.statblock)
      } else {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="bg-[#252525] border border-white/[0.1] rounded-lg w-full max-w-md flex flex-col max-h-[80vh]"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-sm font-medium text-[#e6e6e6]">Roll Initiative</h2>
            <p className="text-[11px] text-[#787774] mt-0.5">Edit any value before confirming</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setValues(buildRolls())}
              className="text-xs text-[#787774] hover:text-[#e6e6e6] border border-white/[0.1] hover:border-white/[0.2] rounded px-2.5 py-1 transition-colors"
            >
              Reroll All
            </button>
            <button
              className="text-[#787774] hover:text-[#e6e6e6] text-base leading-none transition-colors"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Rows */}
        <div className="overflow-y-auto flex-1 divide-y divide-white/[0.04]">
          {combatants.map((c) => (
            <div key={c.id} className="flex items-center px-5 py-3 gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#e6e6e6] truncate">{c.name}</span>
                  {c.type === 'pc' && (
                    <span className="text-[10px] text-blue-400/80 border border-blue-400/30 px-1.5 rounded">
                      PC
                    </span>
                  )}
                  {c.type === 'quick' && (
                    <span className="text-[10px] text-[#787774] border border-white/[0.1] px-1.5 rounded">
                      NPC
                    </span>
                  )}
                </div>
                {c.type === 'monster' && c.statblock && (
                  <span className="text-[11px] text-[#787774]">
                    {c.statblock.InitiativeModifier !== undefined
                      ? `Init ${c.statblock.InitiativeModifier >= 0 ? '+' : ''}${c.statblock.InitiativeModifier}`
                      : `Dex ${c.statblock.Abilities?.Dex ?? '?'}`}
                  </span>
                )}
              </div>
              <input
                type="number"
                value={values[c.id] ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [c.id]: e.target.value }))}
                placeholder="—"
                className="w-14 bg-transparent border-b border-white/[0.12] py-1 text-center font-mono text-sm text-[#e6e6e6] focus:outline-none focus:border-gold-400 placeholder:text-[#787774] transition-colors"
              />
            </div>
          ))}
          {combatants.length === 0 && (
            <p className="text-[#787774] text-sm text-center py-6">No combatants to roll for.</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.06]">
          <button
            onClick={handleConfirm}
            className="w-full bg-gold-400 hover:bg-gold-300 text-[#1a1a1a] font-semibold text-sm rounded px-4 py-2.5 transition-colors"
          >
            Confirm & Sort
          </button>
        </div>
      </div>
    </div>
  )
}
