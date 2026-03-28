import { useState, useEffect, useRef } from 'react'

export function DamageModal({ combatant, onConfirm, onClose, onSetTempHp }) {
  const [value, setValue] = useState('')
  const [tempHpValue, setTempHpValue] = useState('')
  const inputRef = useRef(null)

  const tempHp = combatant.tempHp ?? 0

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

  const handleSetTempHp = () => {
    const amount = parseInt(tempHpValue, 10)
    if (!isNaN(amount) && amount >= 0) {
      onSetTempHp?.(combatant.id, amount)
      setTempHpValue('')
    }
  }

  const parsed  = parseInt(value, 10)
  const isDmg   = parsed > 0
  const isHeal  = parsed < 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="glass-modal rounded-2xl w-80 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-medium text-[#e6e6e6] mb-0.5">Apply Damage / Healing</h3>
        <p className="text-xs text-[#7a7874] mb-4">
          {combatant.name} -{' '}
          <span className="font-mono text-[#e6e6e6]">
            {combatant.hp?.current}/{combatant.hp?.max} HP
          </span>
          {tempHp > 0 && (
            <span className="font-mono text-blue-400 ml-1">(+{tempHp} temp)</span>
          )}
        </p>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 8 damage, -5 healing"
            className="input-field font-mono"
          />
          {value !== '' && !isNaN(parsed) && (
            <p className={`text-xs mt-1.5 ${isDmg ? 'text-red-400' : isHeal ? 'text-green-400' : 'text-[#7a7874]'}`}>
              {isDmg ? `${parsed} damage` : isHeal ? `${-parsed} healing` : 'no change'}
            </p>
          )}
          <div className="flex gap-2 mt-5">
            <button
              type="submit"
              className="btn-neon-gold flex-1"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-outline flex-1"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Temp HP section */}
        <div className="mt-4 pt-4 border-t border-white/[0.05]">
          <label className="text-xs text-[#7a7874] block mb-1.5">Temporary HP</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={tempHpValue}
              onChange={(e) => setTempHpValue(e.target.value)}
              placeholder={tempHp > 0 ? String(tempHp) : '0'}
              min="0"
              className="input-field flex-1 font-mono !border-blue-400/20 focus:!border-blue-400/50"
            />
            <button
              type="button"
              onClick={handleSetTempHp}
              className="shrink-0 text-xs text-blue-400 border border-blue-400/30 hover:bg-blue-400/10 px-2.5 py-1 rounded-lg transition-all hover:shadow-neon-blue"
            >
              Set
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
