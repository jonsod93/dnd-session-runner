import { useState, useEffect, useRef } from 'react'

export function DamageModal({ combatant, onConfirm, onClose }) {
  const [value, setValue] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const handleSubmit = (e) => {
    e.preventDefault()
    const amount = parseInt(value, 10)
    if (!isNaN(amount)) onConfirm(amount)
  }

  const parsed  = parseInt(value, 10)
  const isDmg   = parsed > 0
  const isHeal  = parsed < 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="bg-[#252525] border border-white/[0.1] rounded-lg w-80 p-5"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-medium text-[#e6e6e6] mb-0.5">Apply Damage / Healing</h3>
        <p className="text-xs text-[#9a9894] mb-4">
          {combatant.name} —{' '}
          <span className="font-mono text-[#e6e6e6]">
            {combatant.hp?.current}/{combatant.hp?.max} HP
          </span>
        </p>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 8 damage, −5 healing"
            className="w-full bg-transparent border-b border-white/[0.12] py-2 text-sm font-mono text-[#e6e6e6] focus:outline-none focus:border-gold-400 placeholder:text-[#787774] transition-colors"
          />
          {value !== '' && !isNaN(parsed) && (
            <p className={`text-xs mt-1.5 ${isDmg ? 'text-red-400' : isHeal ? 'text-green-400' : 'text-[#9a9894]'}`}>
              {isDmg ? `−${parsed} HP (damage)` : isHeal ? `+${-parsed} HP (healing)` : 'no change'}
            </p>
          )}
          <div className="flex gap-2 mt-5">
            <button
              type="submit"
              className="flex-1 bg-gold-400 hover:bg-gold-300 text-[#1a1a1a] font-semibold text-sm rounded px-4 py-2 transition-colors"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 text-sm text-[#9a9894] hover:text-[#e6e6e6] hover:bg-white/[0.06] rounded px-4 py-2 transition-colors border border-white/[0.1]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
