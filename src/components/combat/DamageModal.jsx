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

  const isDmg = parseInt(value, 10) > 0
  const isHeal = parseInt(value, 10) < 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-600 rounded-lg shadow-2xl w-80 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-xs uppercase tracking-widest text-gold-400 mb-1">
          Apply Damage / Healing
        </h3>
        <p className="text-slate-400 text-sm mb-4">
          {combatant.name} —{' '}
          <span className="font-mono text-slate-300">
            {combatant.hp?.current}/{combatant.hp?.max} HP
          </span>
        </p>
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <input
              ref={inputRef}
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. 8 (damage) or -5 (healing)"
              className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-100 font-mono text-sm focus:outline-none focus:border-gold-500 placeholder:text-slate-600"
            />
          </div>
          {value !== '' && !isNaN(parseInt(value)) && (
            <p className={`text-xs mt-1.5 ${isDmg ? 'text-red-400' : isHeal ? 'text-green-400' : 'text-slate-400'}`}>
              {isDmg
                ? `−${parseInt(value)} HP (damage)`
                : isHeal
                ? `+${-parseInt(value)} HP (healing)`
                : 'no change'}
            </p>
          )}
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              className="flex-1 bg-gold-500 hover:bg-gold-400 text-slate-950 font-semibold text-sm rounded px-4 py-2 transition-colors"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded px-4 py-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
