import { useEffect } from 'react'

const DURATION = 4500

export function DiceRollToast({ rolls, onExpire }) {
  return (
    <div className="fixed bottom-4 max-lg:bottom-auto max-lg:top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col-reverse max-lg:flex-col gap-2 items-center pointer-events-none">
      {rolls.map((roll) => (
        <ToastItem key={roll.id} roll={roll} onExpire={onExpire} />
      ))}
    </div>
  )
}

function ToastItem({ roll, onExpire }) {
  useEffect(() => {
    const t = setTimeout(() => onExpire(roll.id), DURATION)
    return () => clearTimeout(t)
  }, [roll.id, onExpire])

  const isAttack = roll.rollType === 'attack'
  const totalColor = roll.damageTypeColor || (isAttack ? '#93c5fd' : undefined) // blue-300 for attacks
  const hasContext = roll.context || roll.combatantName

  return (
    <div className="pointer-events-auto bg-[#252525] border border-white/[0.12] rounded-lg shadow-xl px-4 py-2.5 min-w-[240px] max-w-[420px]">
      {/* Heading row: context as title, combatant name smaller */}
      {hasContext && (
        <div className="flex items-baseline gap-2 mb-1.5">
          {roll.context && (
            <span className="text-sm font-semibold text-[#e6e6e6] capitalize">{roll.context}</span>
          )}
          {roll.combatantName && (
            <span className="text-xs text-[#787774]/60 truncate">{roll.combatantName}</span>
          )}
        </div>
      )}
      {/* Roll result row */}
      <div className="flex items-center gap-4">
        <span className="text-xs text-[#9a9894] font-mono shrink-0">{roll.label}</span>
        <span
          className={`text-xl font-bold font-mono shrink-0 ${!totalColor ? 'text-gold-400' : ''}`}
          style={totalColor ? { color: totalColor } : undefined}
        >
          {roll.total}
        </span>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xs text-[#787774]/70 font-mono truncate">{roll.detail}</span>
          {roll.damageType && (
            <span
              className="text-xs font-medium capitalize"
              style={roll.damageTypeColor ? { color: roll.damageTypeColor } : undefined}
            >
              {roll.damageType} damage
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
