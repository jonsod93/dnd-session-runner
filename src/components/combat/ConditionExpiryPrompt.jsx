import { useState, useEffect } from 'react'
import { d20, abilityMod, formatMod } from '../../utils/combatUtils'

const ABILITIES = ['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha']

export function ConditionExpiryPrompt({ expiry, combatant, onKeep, onClear }) {
  const { condition } = expiry
  const [rollResult, setRollResult] = useState(null) // { ability, roll, mod, total }

  // Auto-dismiss for no-save expiries
  useEffect(() => {
    if (!condition.needsSave) {
      const t = setTimeout(onClear, 2500)
      return () => clearTimeout(t)
    }
  }, [condition.needsSave, onClear])

  const handleRoll = (ability) => {
    const score = combatant?.statblock?.Abilities?.[ability] ?? 10
    const mod = abilityMod(score)
    const roll = d20()
    const total = roll + mod
    setRollResult({ ability, roll, mod, total })
  }

  // No-save: auto-dismissing notification
  if (!condition.needsSave) {
    return (
      <div
        className="fixed inset-0 z-[65] flex items-center justify-center pointer-events-none"
      >
        <div
          className="pointer-events-auto bg-[#252525] border border-amber-500/30 rounded-lg shadow-xl px-5 py-3 max-w-sm animate-fade-in"
        >
          <p className="text-sm text-[#e6e6e6]">
            <span className="font-medium text-amber-400">{condition.name}</span> on{' '}
            <span className="font-medium">{combatant?.name ?? 'unknown'}</span> has been removed.
          </p>
        </div>
      </div>
    )
  }

  // Needs save: full modal
  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
    >
      <div
        className="bg-[#252525] border border-white/[0.1] rounded-lg w-80 p-5"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-medium text-[#e6e6e6] mb-1">
          {condition.name} - Save
        </h3>
        <p className="text-xs text-[#9a9894] mb-3">
          {combatant?.name ?? 'Unknown'} must save or lose {condition.name}
        </p>

        {/* Ability buttons */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {ABILITIES.map((ab) => {
            const score = combatant?.statblock?.Abilities?.[ab] ?? 10
            const mod = abilityMod(score)
            return (
              <button
                key={ab}
                className={`text-center px-2 py-2 text-xs rounded border transition-colors ${
                  rollResult?.ability === ab
                    ? 'border-gold-400/40 bg-gold-400/10 text-gold-400'
                    : 'border-white/[0.12] text-[#e6e6e6] hover:bg-white/[0.06]'
                }`}
                onClick={() => handleRoll(ab)}
              >
                <div className="font-medium">{ab}</div>
                <div className="text-[10px] text-[#9a9894] font-mono">{formatMod(mod)}</div>
              </button>
            )
          })}
        </div>

        {/* Roll result */}
        {rollResult && (
          <div className="text-center mb-3 py-2 bg-white/[0.03] rounded">
            <div className="text-xs text-[#9a9894] mb-0.5">{rollResult.ability} Save</div>
            <div className="text-xl font-bold font-mono text-gold-400">{rollResult.total}</div>
            <div className="text-[10px] text-[#787774] font-mono">
              d20({rollResult.roll}){formatMod(rollResult.mod)}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={onKeep}
            className="flex-1 text-sm text-[#9a9894] hover:text-[#e6e6e6] hover:bg-white/[0.06] rounded px-4 py-2 transition-colors border border-white/[0.1]"
          >
            Keep
          </button>
          <button
            onClick={onClear}
            className="flex-1 bg-red-500/80 hover:bg-red-500 text-white font-semibold text-sm rounded px-4 py-2 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}
