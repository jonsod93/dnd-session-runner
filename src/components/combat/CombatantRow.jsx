import { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CONDITIONS, getConditionColor, uid } from '../../utils/combatUtils'

export function CombatantRow({
  combatant,
  isActive,
  isSelected,
  onSetActive,
  onRemove,
  onDamage,
  onAddCondition,
  onRemoveCondition,
  onSelect,
}) {
  const [showCondMenu, setShowCondMenu] = useState(false)
  const condMenuRef = useRef(null)

  const isLair = combatant.type === 'lair'
  const isDead = combatant.hp?.current === 0
  const isPC = combatant.type === 'pc'

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: combatant.id,
    disabled: isLair,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  }

  // Close condition menu on outside click
  useEffect(() => {
    if (!showCondMenu) return
    const h = (e) => {
      if (!condMenuRef.current?.contains(e.target)) setShowCondMenu(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [showCondMenu])

  const hpPercent = combatant.hp ? combatant.hp.current / combatant.hp.max : null
  const hpColor =
    hpPercent === null
      ? ''
      : hpPercent <= 0.25
      ? 'text-red-400'
      : hpPercent <= 0.5
      ? 'text-amber-400'
      : 'text-slate-300'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'flex items-center gap-2 px-2 py-1.5 border-l-[3px] transition-colors',
        isActive
          ? 'border-gold-400 bg-slate-800/70'
          : 'border-transparent hover:bg-slate-800/30',
        isSelected && !isActive ? 'bg-slate-800/50' : '',
        isDead ? 'opacity-40' : '',
        isDragging ? 'opacity-50' : '',
      ].join(' ')}
    >
      {/* Drag handle */}
      <button
        {...(isLair ? {} : { ...attributes, ...listeners })}
        className={`shrink-0 text-slate-700 ${isLair ? 'invisible' : 'hover:text-slate-500 cursor-grab active:cursor-grabbing'}`}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        aria-label="Drag to reorder"
      >
        <GripIcon />
      </button>

      {/* Active arrow */}
      <span className={`shrink-0 w-3 text-gold-400 text-xs ${isActive ? 'opacity-100' : 'opacity-0'}`}>
        ▶
      </span>

      {/* Initiative — click to set active turn */}
      <button
        className="w-7 shrink-0 text-center font-mono text-sm font-semibold text-slate-300 hover:text-gold-400 transition-colors"
        onClick={(e) => { e.stopPropagation(); onSetActive(combatant.id) }}
        title="Set as active turn"
      >
        {combatant.initiative ?? '—'}
      </button>

      {/* Name — click to open statblock */}
      <button
        className={`flex-1 text-left text-sm truncate ${
          isLair
            ? 'text-slate-500 italic'
            : isPC
            ? 'text-blue-300 font-medium'
            : 'text-slate-100'
        } ${isDead ? 'line-through' : ''}`}
        onClick={() => onSelect(combatant)}
      >
        {combatant.name}
      </button>

      {/* AC */}
      {combatant.ac != null && (
        <span className="shrink-0 text-xs text-slate-400 w-10 text-right">
          <span className="text-slate-600">AC </span>{combatant.ac}
        </span>
      )}

      {/* HP + damage button */}
      {combatant.hp != null && (
        <div
          className="shrink-0 flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <span className={`text-xs font-mono ${hpColor}`}>
            {combatant.hp.current}/{combatant.hp.max}
          </span>
          <button
            className="text-[10px] font-mono text-slate-600 hover:text-gold-400 hover:bg-slate-700 px-1 py-0.5 rounded transition-colors"
            onClick={() => onDamage(combatant.id)}
            title="Apply damage (T)"
          >
            T
          </button>
        </div>
      )}

      {/* Conditions */}
      {!isLair && (
        <div
          className="flex flex-wrap gap-0.5 items-center max-w-[140px]"
          onClick={(e) => e.stopPropagation()}
        >
          {combatant.conditions.map((cond) => (
            <span
              key={cond.id}
              className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded ${cond.color}`}
            >
              {cond.name}
              <button
                className="opacity-60 hover:opacity-100 leading-none"
                onClick={() => onRemoveCondition(combatant.id, cond.id)}
              >
                ×
              </button>
            </span>
          ))}
          <div className="relative" ref={condMenuRef}>
            <button
              className="text-xs text-slate-600 hover:text-slate-300 w-4 h-4 flex items-center justify-center rounded hover:bg-slate-700 transition-colors"
              onClick={() => setShowCondMenu((v) => !v)}
              title="Add condition"
            >
              +
            </button>
            {showCondMenu && (
              <ConditionMenu
                onAdd={(cond) => {
                  onAddCondition(combatant.id, { id: uid(), ...cond })
                  setShowCondMenu(false)
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Remove */}
      <button
        className="shrink-0 text-slate-700 hover:text-red-500 transition-colors ml-1 leading-none"
        onClick={(e) => { e.stopPropagation(); onRemove(combatant.id) }}
        title="Remove combatant"
      >
        ✕
      </button>
    </div>
  )
}

// ── Condition dropdown ────────────────────────────────────────────────────────
function ConditionMenu({ onAdd }) {
  const [custom, setCustom] = useState('')

  return (
    <div className="absolute left-0 bottom-6 z-20 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl w-44 py-1 max-h-64 overflow-y-auto">
      {CONDITIONS.map((c) => (
        <button
          key={c.name}
          className="w-full text-left px-3 py-1 text-xs text-slate-300 hover:bg-slate-700 transition-colors"
          onClick={() => onAdd({ name: c.name, color: c.color })}
        >
          {c.name}
        </button>
      ))}
      <div className="border-t border-slate-700 mt-1 pt-1 px-2">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const t = custom.trim()
            if (t) onAdd({ name: t, color: 'bg-slate-700/60 text-slate-300' })
            setCustom('')
          }}
        >
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Custom…"
            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-gold-500 placeholder:text-slate-600"
          />
        </form>
      </div>
    </div>
  )
}

// ── Grip icon ────────────────────────────────────────────────────────────────
function GripIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
      <circle cx="2" cy="2.5" r="1.2" /><circle cx="8" cy="2.5" r="1.2" />
      <circle cx="2" cy="7"   r="1.2" /><circle cx="8" cy="7"   r="1.2" />
      <circle cx="2" cy="11.5" r="1.2" /><circle cx="8" cy="11.5" r="1.2" />
    </svg>
  )
}
