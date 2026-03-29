import { useState, useEffect, useRef } from 'react'
import { useGsapEntrance } from '../../hooks/useGsapEntrance'

export function DamageModal({ combatant, onConfirm, onClose, onSetTempHp }) {
  const [value, setValue] = useState('')
  const [tempHpValue, setTempHpValue] = useState('')
  const inputRef = useRef(null)
  const panelRef = useGsapEntrance()

  const tempHp = combatant.tempHp ?? 0

  useEffect(() => {
    inputRef.current?.focus()
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const handleApply = (e) => {
    e.preventDefault()
    const dmgAmount = parseInt(value, 10)
    const tmpAmount = parseInt(tempHpValue, 10)
    const hasDmg = !isNaN(dmgAmount) && dmgAmount !== 0
    const hasTmp = !isNaN(tmpAmount) && tmpAmount >= 0

    if (!hasDmg && !hasTmp) return

    // Apply temp HP first so damage is absorbed correctly
    if (hasTmp) onSetTempHp?.(combatant.id, tmpAmount)
    if (hasDmg) onConfirm(dmgAmount)

    if (!hasDmg) onClose()
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
        ref={panelRef}
        className="glass-toast rounded-2xl w-80 p-5 relative"
        style={{ background: 'rgba(62, 62, 62, 0.65)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-[#787774] hover:text-[#e6e6e6] transition-colors text-sm leading-none"
        >
          ✕
        </button>

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

        <form onSubmit={handleApply}>
          {/* Damage / Healing */}
          <label className="text-xs text-[#7a7874] block mb-1.5">Damage or Healing</label>
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

          {/* Temp HP */}
          <div className="mt-4 pt-4 border-t border-black/[0.15]">
            <label className="text-xs text-[#7a7874] block mb-1.5">Temporary HP</label>
            <input
              type="number"
              value={tempHpValue}
              onChange={(e) => setTempHpValue(e.target.value)}
              placeholder={tempHp > 0 ? String(tempHp) : '0'}
              min="0"
              className="input-field flex-1 font-mono !border-blue-400/20 focus:!border-blue-400/50"
            />
          </div>

          {/* Apply button */}
          <button
            type="submit"
            className="btn-action w-full mt-5 !text-sm !px-4 !py-2 !text-white !font-semibold"
          >
            Apply
          </button>
        </form>
      </div>
    </div>
  )
}
