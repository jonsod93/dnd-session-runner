import { useEffect } from 'react'

const DURATION = 4500
const DAMAGE_DURATION = 10000

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
    const duration = roll.hasDamage ? DAMAGE_DURATION : DURATION
    const t = setTimeout(() => onExpire(roll.id), duration)
    return () => clearTimeout(t)
  }, [roll.id, roll.hasDamage, onExpire])

  const isAttack = roll.rollType === 'attack'
  const isCrit = isAttack && roll.naturalRoll === 20
  const isCritMiss = isAttack && roll.naturalRoll === 1
  const totalColor = isCrit ? '#4ade80' : isCritMiss ? '#f87171' : roll.damageTypeColor || (isAttack ? '#FF7A45' : undefined)
  const hasContext = roll.context || roll.combatantName

  return (
    <div
      className={`pointer-events-auto glass-toast toast-item ${roll.hasDamage ? 'pl-4 pr-8 py-3 min-w-[280px]' : 'px-4 py-2.5 min-w-[240px]'} max-w-[420px] relative`}
      style={isCrit
        ? { background: '#1e2520', boxShadow: '0 28px 60px rgba(0,0,0,0.78), 0 10px 24px rgba(0,0,0,0.50), 0 0 20px rgba(74,222,128,0.25), inset 0 1px 0 rgba(255,255,255,0.065)', borderColor: 'rgba(74, 222, 128, 0.35)' }
        : isCritMiss
        ? { background: '#251e1e', boxShadow: '0 28px 60px rgba(0,0,0,0.78), 0 10px 24px rgba(0,0,0,0.50), 0 0 20px rgba(248,113,113,0.25), inset 0 1px 0 rgba(255,255,255,0.065)', borderColor: 'rgba(248, 113, 113, 0.35)' }
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
        <div className="flex flex-col mb-2 pb-2 border-b border-white/[0.08]">
          {roll.context && (
            <span className="text-sm font-semibold text-[#e6e6e6] capitalize">{roll.context}</span>
          )}
          {roll.combatantName && (
            <span className="text-xs text-[#b0aeaa] font-medium truncate">{roll.combatantName}</span>
          )}
        </div>
      )}

      {isAttack && roll.hasDamage && (
        <div className="text-xs font-semibold mb-1.5 text-[#e6e6e6]">To hit</div>
      )}

      {/* Roll info */}
      <div className="flex flex-col gap-0.5" style={(!isAttack && roll.damageTypeColor) ? { color: roll.damageTypeColor } : undefined}>
        <span className="text-xs font-mono font-semibold shrink-0" style={(!isAttack && roll.damageTypeColor) ? { opacity: 0.8 } : { color: '#b0aeaa' }}>{roll.label}</span>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-mono font-medium truncate" style={(!isAttack && roll.damageTypeColor) ? { opacity: 0.7 } : { color: '#9a9896' }}>
            <DetailWithNatColor detail={roll.detail} />
          </span>
          {isCrit && (
            <span className="text-xs font-bold text-green-400 shrink-0">Critical hit!</span>
          )}
          {isCritMiss && (
            <span className="text-xs font-bold text-red-400 shrink-0">Critical miss!</span>
          )}
          {roll.damageType && (
            <span className="text-xs font-medium capitalize shrink-0">
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
          {roll.damageAlternatives ? (
            // Alternative damage groups separated by "or"
            roll.damageAlternatives.map((altTotal, gi) => {
              // Find which rolls belong to this group using stored group sizes
              const offset = (roll.damageGroupSizes || []).slice(0, gi).reduce((a, b) => a + b, 0)
              const groupRolls = roll.damageRolls.slice(offset, offset + (roll.damageGroupSizes?.[gi] ?? 1))
              return (
                <div key={gi}>
                  {gi > 0 && <div className="text-xs text-[#9a9896] italic my-1">or</div>}
                  {groupRolls.map((dr, idx) => {
                    const rowColor = dr.damageTypeColor || '#e6e6e6'
                    return (
                      <div key={idx} className="flex flex-col gap-0.5 mb-1.5" style={{ color: rowColor }}>
                        <span className="text-xs font-mono font-semibold" style={{ opacity: 0.8 }}>{dr.label}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-medium truncate" style={{ opacity: 0.7 }}>{dr.detail}</span>
                          {dr.damageType && (
                            <span className="text-xs font-medium capitalize shrink-0">{dr.damageType}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })
          ) : (
            roll.damageRolls.map((dr, idx) => {
              const rowColor = dr.damageTypeColor || '#e6e6e6'
              return (
                <div key={idx} className="flex flex-col gap-0.5 mb-1.5" style={{ color: rowColor }}>
                  <span className="text-xs font-mono font-semibold" style={{ opacity: 0.8 }}>{dr.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-medium truncate" style={{ opacity: 0.7 }}>{dr.detail}</span>
                    {dr.damageType && (
                      <span className="text-xs font-medium capitalize shrink-0">{dr.damageType}</span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Totals section */}
      <div className="mt-2 pt-2 border-t border-white/[0.08] flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#b0aeaa] font-semibold">{isAttack ? 'To hit' : 'Total'}</span>
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
