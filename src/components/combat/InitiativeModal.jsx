import { useState, useEffect, useMemo } from 'react'
import { rollInitiative } from '../../utils/combatUtils'

function isMinion(statblock) {
  if (!statblock?.Traits) return false
  return statblock.Traits.some((t) => {
    const text = `${t.Name ?? ''} ${t.Content ?? ''} ${t.Description ?? ''}`.toLowerCase()
    return text.includes('minion')
  })
}

function getMinionBaseName(name) {
  return name.replace(/\s+\d+$/, '')
}

export function InitiativeModal({ combatants, onConfirm, onClose }) {
  const { displayRows, minionGroups } = useMemo(() => {
    const groups = {}
    const display = []
    const seen = new Set()

    for (const c of combatants) {
      if (isMinion(c.statblock)) {
        const base = getMinionBaseName(c.name)
        if (!groups[base]) groups[base] = []
        groups[base].push(c.id)
        if (!seen.has(base)) {
          seen.add(base)
          display.push({ ...c, _minionGroup: base, _minionCount: 0 })
        }
      } else {
        display.push(c)
      }
    }
    for (const row of display) {
      if (row._minionGroup) {
        row._minionCount = groups[row._minionGroup].length
      }
    }
    return { displayRows: display, minionGroups: groups }
  }, [combatants])

  const buildRolls = () => {
    const map = {}
    displayRows.forEach((c) => {
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
      if (isNaN(n)) return
      const row = displayRows.find((r) => r.id === id)
      if (row?._minionGroup) {
        for (const memberId of minionGroups[row._minionGroup]) {
          map[memberId] = n
        }
      } else {
        map[id] = n
      }
    })
    onConfirm(map)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(5,7,10,0.5)' }}
      onClick={onClose}
    >
      <div
        className="glass-modal rounded-2xl w-full max-w-md flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.15]">
          <div>
            <h2 className="text-sm font-medium text-[#e6e6e6]">Roll Initiative</h2>
            <p className="text-xs text-[#7a7874] mt-0.5">Edit any value before confirming</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setValues(buildRolls())}
              className="btn-action"
            >
              Reroll All
            </button>
            <button
              className="text-[#5a5854] hover:text-[#e6e6e6] text-base leading-none transition-colors"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Rows */}
        <div className="overflow-y-auto flex-1 p-3 flex flex-col gap-1.5">
          {displayRows.map((c) => (
            <div key={c.id} className="flex items-center px-3.5 py-2.5 gap-4 library-card">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#e6e6e6] truncate">
                    {c._minionGroup ? getMinionBaseName(c.name) : c.name}
                  </span>
                  {c.type === 'pc' && (
                    <span className="text-xs text-green-400/80 border border-green-400/30 px-1.5 rounded-lg">
                      PC
                    </span>
                  )}
                  {c.type === 'quick' && (
                    <span className="text-xs text-[#7a7874] border border-white/[0.08] px-1.5 rounded-lg">
                      NPC
                    </span>
                  )}
                  {c._minionCount > 1 && (
                    <span className="text-xs text-teal-400/80 border border-teal-400/30 px-1.5 rounded-lg">
                      x{c._minionCount}
                    </span>
                  )}
                </div>
                {c.type === 'monster' && c.statblock && (
                  <span className="text-xs text-[#7a7874]">
                    {c.statblock.InitiativeModifier !== undefined
                      ? `Init ${c.statblock.InitiativeModifier >= 0 ? '+' : ''}${c.statblock.InitiativeModifier}`
                      : `Dex ${c.statblock.Abilities?.Dex ?? '?'}`}
                    {c._minionGroup ? ' · Minion' : ''}
                  </span>
                )}
              </div>
              <input
                type="number"
                value={values[c.id] ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [c.id]: e.target.value }))}
                placeholder="--"
                className="w-14 bg-[#131517] border-none rounded-lg py-1.5 text-center font-mono text-sm text-[#e6e6e6] focus:outline-none shadow-[inset_2px_2px_5px_rgba(5,7,10,0.5),inset_-2px_-2px_5px_rgba(45,50,60,0.15)] focus:shadow-[inset_2px_2px_5px_rgba(5,7,10,0.5),inset_-2px_-2px_5px_rgba(45,50,60,0.15),0_0_0_2px_rgba(255,107,53,0.3)] placeholder:text-[#5a5854] transition-all"
              />
            </div>
          ))}
          {displayRows.length === 0 && (
            <p className="text-[#7a7874] text-sm text-center py-6">No combatants to roll for.</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-black/[0.15]">
          <button
            onClick={handleConfirm}
            className="btn-neon-gold w-full py-2.5"
          >
            Confirm & Sort
          </button>
        </div>
      </div>
    </div>
  )
}
