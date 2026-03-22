import { useEffect } from 'react'

const DURATION = 4500

export function DiceRollToast({ rolls, onExpire }) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex flex-col-reverse gap-2 items-center pointer-events-none">
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

  return (
    <div className="pointer-events-auto bg-[#252525] border border-white/[0.12] rounded-lg shadow-xl flex items-center gap-4 px-4 py-2.5 min-w-[220px] max-w-[400px]">
      <div className="flex flex-col gap-0.5 shrink-0">
        <span className="text-[11px] text-[#787774] font-mono">{roll.label}</span>
        {roll.context && (
          <span className="text-[10px] text-[#787774]/60 truncate">{roll.context}</span>
        )}
      </div>
      <span
        className={`text-xl font-bold font-mono shrink-0 ${!totalColor ? 'text-gold-400' : ''}`}
        style={totalColor ? { color: totalColor } : undefined}
      >
        {roll.total}
      </span>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[10px] text-[#787774]/70 font-mono truncate">{roll.detail}</span>
        {roll.damageType && (
          <span
            className="text-[10px] font-medium capitalize"
            style={roll.damageTypeColor ? { color: roll.damageTypeColor } : undefined}
          >
            {roll.damageType} damage
          </span>
        )}
      </div>
    </div>
  )
}
