import { useEffect } from 'react'

const DURATION = 4500

export function DiceRollToast({ rolls, onExpire, spellDrawerOpen }) {
  const desktopBottom = spellDrawerOpen ? 'bottom-[calc(38vh+2rem)]' : 'bottom-4'
  return (
    <div className={`fixed ${desktopBottom} max-lg:bottom-auto max-lg:top-20 left-1/2 -translate-x-1/2 z-[2200] flex flex-col-reverse max-lg:flex-col gap-2 items-center pointer-events-none transition-[bottom] duration-300`}>
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
  const isCrit = isAttack && roll.naturalRoll === 20
  const isCritMiss = isAttack && roll.naturalRoll === 1
  const totalColor = isCrit ? '#4ade80' : isCritMiss ? '#f87171' : roll.damageTypeColor || (isAttack ? '#e87830' : undefined)
  const borderColor = isCrit ? 'border-green-400/40' : isCritMiss ? 'border-red-400/40' : 'border-white/[0.08]'
  const glowStyle = isCrit
    ? { boxShadow: '0 0 16px rgba(74, 222, 128, 0.2)' }
    : isCritMiss
    ? { boxShadow: '0 0 16px rgba(248, 113, 113, 0.2)' }
    : {}
  const hasContext = roll.context || roll.combatantName

  return (
    <div
      className={`pointer-events-auto glass-modal !rounded-2xl border ${borderColor} px-4 py-2.5 min-w-[240px] max-w-[420px]`}
      style={glowStyle}
    >
      {hasContext && (
        <div className="flex items-baseline gap-2 mb-1.5">
          {roll.context && (
            <span className="text-sm font-semibold text-[#e6e6e6] capitalize">{roll.context}</span>
          )}
          {roll.combatantName && (
            <span className="text-xs text-[#5a5854] truncate">{roll.combatantName}</span>
          )}
        </div>
      )}
      <div className="flex items-center gap-4">
        <span className="text-xs text-[#7a7874] font-mono shrink-0">{roll.label}</span>
        <span
          className={`text-xl font-bold font-mono shrink-0 ${!totalColor ? 'text-gold-400' : ''}`}
          style={totalColor ? { color: totalColor } : undefined}
        >
          {roll.total}
        </span>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xs text-[#5a5854] font-mono truncate">
            <DetailWithNatColor detail={roll.detail} />
          </span>
          {isCrit && (
            <span className="text-xs font-bold text-green-400">Critical hit!</span>
          )}
          {isCritMiss && (
            <span className="text-xs font-bold text-red-400">Critical miss!</span>
          )}
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

function DetailWithNatColor({ detail }) {
  if (!detail) return null
  // Match [X] or d20(X) patterns
  const match = detail.match(/^(.*?)([\[(](\d+)[\])])(.*)$/)
  if (!match) return detail
  const [, before, bracket, num, after] = match
  const n = parseInt(num, 10)
  const color = n === 20 ? '#4ade80' : n === 1 ? 'rgb(255, 90, 90)' : null
  if (!color) return detail
  return <>{before}<span style={{ color }}>{bracket}</span>{after}</>
}
