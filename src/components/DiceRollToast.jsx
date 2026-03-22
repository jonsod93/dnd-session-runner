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

  return (
    <div className="pointer-events-auto bg-[#252525] border border-white/[0.12] rounded-lg shadow-xl flex items-center gap-4 px-4 py-2.5 min-w-[220px]">
      <span className="text-[11px] text-[#787774] font-mono shrink-0">{roll.label}</span>
      <span className={`text-xl font-bold font-mono shrink-0 ${isAttack ? 'text-blue-300' : 'text-gold-400'}`}>
        {roll.total}
      </span>
      <span className="text-[10px] text-[#787774]/70 font-mono truncate">{roll.detail}</span>
    </div>
  )
}
