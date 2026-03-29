import { useState, useEffect } from 'react'
import { useGsapEntrance } from '../../hooks/useGsapEntrance'
import { d20, abilityMod, formatMod } from '../../utils/combatUtils'

const ABILITIES = ['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha']
const ABILITY_FULL = { str: 'strength', dex: 'dexterity', con: 'constitution', int: 'intelligence', wis: 'wisdom', cha: 'charisma' }

function getSaveMod(statblock, ability) {
  const key = ability.toLowerCase()
  const save = statblock?.Saves?.find((s) => {
    const n = s.Name?.toLowerCase().trim()
    return n === key || n === ABILITY_FULL[key]
  })
  if (save != null) return { mod: save.Modifier, proficient: true }
  const score = statblock?.Abilities?.[ability] ?? 10
  return { mod: abilityMod(score), proficient: false }
}

export function ConditionExpiryPrompt({ expiry, combatant, onKeep, onClear }) {
  const { condition } = expiry
  const [rollResult, setRollResult] = useState(null)
  const panelRef = useGsapEntrance()

  useEffect(() => {
    if (!condition.needsSave) {
      const t = setTimeout(onClear, 2500)
      return () => clearTimeout(t)
    }
  }, [condition.needsSave, onClear])

  const handleRoll = (ability) => {
    const { mod } = getSaveMod(combatant?.statblock, ability)
    const roll = d20()
    const total = roll + mod
    setRollResult({ ability, roll, mod, total })
  }

  // No-save: auto-dismissing notification
  if (!condition.needsSave) {
    return (
      <div className="fixed inset-0 z-[65] flex items-center justify-center pointer-events-none">
        <div
          ref={panelRef}
          className="pointer-events-auto glass-toast rounded-2xl px-5 py-3 max-w-sm animate-fade-in"
          style={{ background: 'rgba(62, 62, 62, 0.65)', boxShadow: 'inset 0 0 10px rgba(251,191,36,0.15), inset 1px 1px 4px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.4)' }}
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
      style={{ background: 'rgba(0,0,0,0.6)' }}
    >
      <div
        ref={panelRef}
        className="glass-toast rounded-2xl w-80 p-5"
        style={{ background: 'rgba(62, 62, 62, 0.65)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-medium text-[#e6e6e6] mb-1">
          {combatant?.name ?? 'Unknown'} - Saving Throw
        </h3>
        <p className="text-xs text-[#7a7874] mb-3">
          <span className="text-amber-400">{combatant?.name ?? 'Unknown'}</span> must save to lose <span className="text-amber-400">{condition.name}</span>
        </p>

        {/* Ability buttons */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {ABILITIES.map((ab) => {
            const { mod, proficient } = getSaveMod(combatant?.statblock, ab)
            return (
              <button
                key={ab}
                className={`text-center px-2 py-2 text-xs rounded-lg border transition-all ${
                  rollResult?.ability === ab
                    ? 'border-gold-400/40 bg-gold-400/10 text-gold-400 shadow-neu-pressed'
                    : 'text-[#e6e6e6] hover:bg-[#202226] stat-card'
                }`}
                onClick={() => handleRoll(ab)}
              >
                <div className="font-medium">{ab}</div>
                <div className={`text-[10px] font-mono ${proficient ? 'text-gold-400' : 'text-[#7a7874]'}`}>{formatMod(mod)}</div>
              </button>
            )
          })}
        </div>

        {/* Roll result */}
        {rollResult && (
          <div className="text-center mb-3 py-2 stat-card rounded-lg">
            <div className="text-xs text-[#7a7874] mb-0.5">{rollResult.ability} Save</div>
            <div className="text-xl font-bold font-mono text-gold-400">{rollResult.total}</div>
            <div className="text-[10px] text-[#5a5854] font-mono">
              d20({rollResult.roll}){formatMod(rollResult.mod)}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClear}
            className="flex-1 btn-action text-sm !px-4 !py-2 !text-green-400"
          >
            Saved
          </button>
          <button
            onClick={onKeep}
            className="flex-1 btn-action text-sm !px-4 !py-2 !text-[rgb(255,90,90)]"
          >
            Failed
          </button>
        </div>
      </div>
    </div>
  )
}
