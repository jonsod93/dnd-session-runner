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
    if (roll.hasDamage) return // no auto-dismiss for combined attack+damage rolls
    const t = setTimeout(() => onExpire(roll.id), DURATION)
    return () => clearTimeout(t)
  }, [roll.id, roll.hasDamage, onExpire])

  const isAttack = roll.rollType === 'attack'
  const isCrit = isAttack && roll.naturalRoll === 20
  const isCritMiss = isAttack && roll.naturalRoll === 1
  const totalColor = isCrit ? '#4ade80' : isCritMiss ? '#f87171' : roll.damageTypeColor || (isAttack ? '#e87830' : undefined)
  const hasContext = roll.context || roll.combatantName

  return (
    <div
      className={`pointer-events-auto glass-toast ${roll.hasDamage ? 'pl-4 pr-8 py-3 min-w-[280px]' : 'px-4 py-2.5 min-w-[240px]'} max-w-[420px] relative`}
      style={isCrit
        ? { background: 'rgba(34, 80, 50, 0.2)', boxShadow: 'inset 0 0 12px rgba(74, 222, 128, 0.12), inset 1px 1px 4px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(74, 222, 128, 0.25)', borderColor: 'rgba(74, 222, 128, 0.35)' }
        : isCritMiss
        ? { background: 'rgba(80, 34, 34, 0.2)', boxShadow: 'inset 0 0 12px rgba(248, 113, 113, 0.12), inset 1px 1px 4px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(248, 113, 113, 0.25)', borderColor: 'rgba(248, 113, 113, 0.35)' }
        : undefined}
    >
      {/* Close button for combined rolls */}
      {roll.hasDamage && (
        <button
          className="absolute top-3 right-3 text-[#9a9896] hover:text-white text-sm leading-none transition-colors p-1"
          onClick={() => onExpire(roll.id)}
          title="Dismiss"
        >
          ✕
        </button>
      )}

      {hasContext && (
        <div className="flex items-baseline gap-2 mb-1.5">
          {roll.context && (
            <span className="text-sm font-semibold text-[#e6e6e6] capitalize">{roll.context}</span>
          )}
          {roll.combatantName && (
            <span className="text-xs text-[#b0aeaa] font-medium truncate">{roll.combatantName}</span>
          )}
        </div>
      )}

      {/* Attack roll row */}
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-[#b0aeaa] font-mono font-semibold shrink-0">{roll.label}</span>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs text-[#9a9896] font-mono font-medium truncate">
            <DetailWithNatColor detail={roll.detail} />
          </span>
          {isCrit && (
            <span className="text-xs font-bold text-green-400 shrink-0">Critical hit!</span>
          )}
          {isCritMiss && (
            <span className="text-xs font-bold text-red-400 shrink-0">Critical miss!</span>
          )}
          {roll.damageType && (
            <span
              className="text-xs font-medium capitalize shrink-0"
              style={roll.damageTypeColor ? { color: roll.damageTypeColor } : undefined}
            >
              {roll.damageType} damage
            </span>
          )}
        </div>
      </div>

      {/* Damage section for combined rolls */}
      {roll.hasDamage && roll.damageRolls?.length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/[0.08]">
          <div className="text-xs font-semibold mb-1.5" style={{ color: isCrit ? '#4ade80' : '#e6e6e6' }}>
            {isCrit ? 'Critical Damage!' : 'Damage'}
          </div>
          {roll.damageRolls.map((dr, idx) => {
            const rowColor = dr.damageTypeColor || '#e6e6e6'
            return (
            <div key={idx} className="flex items-center gap-3 mb-1" style={{ color: rowColor }}>
              <span className="text-xs font-mono font-semibold shrink-0 w-16" style={{ opacity: 0.8 }}>{dr.label}</span>
              <span className="text-xs font-mono font-medium truncate" style={{ opacity: 0.7 }}>{dr.detail}</span>
              {dr.damageType && (
                <span className="text-xs font-medium capitalize shrink-0">
                  {dr.damageType}
                </span>
              )}
            </div>
            )
          })}
        </div>
      )}

      {/* Totals section */}
      <div className="mt-2 pt-2 border-t border-white/[0.08] flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#b0aeaa] font-semibold">Total</span>
          <span
            className={`text-lg font-bold font-mono shrink-0 ${!totalColor ? 'text-gold-400' : ''}`}
            style={totalColor ? { color: totalColor } : undefined}
          >
            {roll.total}
          </span>
        </div>
        {roll.hasDamage && roll.damageRolls?.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#b0aeaa] font-semibold">Damage</span>
            <span className="text-lg font-bold font-mono text-gold-400">
              {roll.damageTotal}
            </span>
            {roll.critMinApplied && (
              <span className="text-xs text-[#9a9896] italic">(min. {roll.critMinTotal})</span>
            )}
          </div>
        )}
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
