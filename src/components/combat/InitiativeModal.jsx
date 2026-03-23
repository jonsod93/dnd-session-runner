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
  // Group minions by base name — show one row per group
  const { displayRows, minionGroups } = useMemo(() => {
    const groups = {}     // baseName → [combatant ids]
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
    // Update counts
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
    // For minion groups, apply same value to all members
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
            <p className="text-xs text-[#9a9894] mt-0.5">Edit any value before confirming</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setValues(buildRolls())}
              className="text-sm text-[#9a9894] hover:text-[#e6e6e6] border border-white/[0.1] hover:border-white/[0.2] rounded px-2.5 py-1 transition-colors"
            >
              Reroll All
            </button>
            <button
              className="text-[#9a9894] hover:text-[#e6e6e6] text-base leading-none transition-colors"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Rows */}
        <div className="overflow-y-auto flex-1 divide-y divide-white/[0.04]">
          {displayRows.map((c) => (
            <div key={c.id} className="flex items-center px-5 py-3 gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#e6e6e6] truncate">
                    {c._minionGroup ? getMinionBaseName(c.name) : c.name}
                  </span>
                  {c.type === 'pc' && (
                    <span className="text-xs text-green-400/80 border border-green-400/30 px-1.5 rounded">
                      PC
                    </span>
                  )}
                  {c.type === 'quick' && (
                    <span className="text-xs text-[#9a9894] border border-white/[0.1] px-1.5 rounded">
                      NPC
                    </span>
                  )}
                  {c._minionCount > 1 && (
                    <span className="text-xs text-teal-400/80 border border-teal-400/30 px-1.5 rounded">
                      ×{c._minionCount}
                    </span>
                  )}
                </div>
                {c.type === 'monster' && c.statblock && (
                  <span className="text-xs text-[#9a9894]">
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
                placeholder="—"
                className="w-14 bg-transparent border-b border-white/[0.12] py-1 text-center font-mono text-sm text-[#e6e6e6] focus:outline-none focus:border-gold-400 placeholder:text-[#787774] transition-colors"
              />
            </div>
          ))}
          {displayRows.length === 0 && (
            <p className="text-[#b8b5b0] text-sm text-center py-6">No combatants to roll for.</p>
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
