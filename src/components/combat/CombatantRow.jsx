import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
  const [condAnchor, setCondAnchor] = useState(null)

  const isLair = combatant.type === 'lair'
  const isPC   = combatant.type === 'pc'
  const isDead = combatant.hp?.current === 0

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: combatant.id,
    disabled: isLair,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  }

  const hpPercent = combatant.hp ? combatant.hp.current / combatant.hp.max : null
  const hpColor =
    hpPercent === null     ? 'text-slate-300' :
    hpPercent <= 0.25      ? 'text-red-400'   :
    hpPercent <= 0.5       ? 'text-amber-400'  :
                             'text-slate-300'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'flex items-center gap-2 px-3 py-3 border-l-[3px] transition-colors min-h-[52px]',
        isActive  ? 'border-gold-400 bg-slate-800/70' : 'border-transparent hover:bg-slate-800/30',
        isSelected && !isActive ? 'bg-slate-800/50' : '',
        isDragging ? 'opacity-50 shadow-lg' : '',
      ].join(' ')}
    >
      {/* ── Drag handle (always full opacity) ─────────────────────────── */}
      <button
        {...(isLair ? {} : { ...attributes, ...listeners })}
        className={`shrink-0 text-slate-700 ${isLair ? 'invisible pointer-events-none' : 'hover:text-slate-500 cursor-grab active:cursor-grabbing'}`}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <GripIcon />
      </button>

      {/* ── Active arrow (always full opacity, never faded by isDead) ─── */}
      <span className={`shrink-0 w-3.5 text-gold-400 text-sm leading-none ${isActive ? 'opacity-100' : 'opacity-0'}`}>
        ▶
      </span>

      {/* ── Initiative (always full opacity) ──────────────────────────── */}
      <button
        className="w-8 shrink-0 text-center font-mono text-base font-bold text-slate-300 hover:text-gold-400 transition-colors"
        onClick={(e) => { e.stopPropagation(); onSetActive(combatant.id) }}
        title="Set as active turn"
      >
        {combatant.initiative ?? '—'}
      </button>

      {/* ── Content block (faded when dead) ───────────────────────────── */}
      <div className={`flex flex-1 items-center gap-3 min-w-0 ${isDead ? 'opacity-40' : ''}`}>

        {/* Name */}
        <button
          className={[
            'text-left text-sm font-medium min-w-[100px] max-w-[220px] truncate shrink-0',
            isLair ? 'text-slate-500 italic' : isPC ? 'text-blue-300' : 'text-slate-100',
            isDead ? 'line-through' : '',
          ].join(' ')}
          onClick={() => onSelect(combatant)}
          title={combatant.name}
        >
          {combatant.name}
        </button>

        {/* AC */}
        {combatant.ac != null && (
          <span className="shrink-0 text-sm text-slate-400">
            <span className="text-slate-600 text-xs">AC</span>{' '}
            <span className="font-mono font-semibold text-slate-300">{combatant.ac}</span>
          </span>
        )}

        {/* HP + T button */}
        {combatant.hp != null && (
          <div className="shrink-0 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <span className={`text-sm font-mono font-semibold ${hpColor}`}>
              {combatant.hp.current}/{combatant.hp.max}
            </span>
            <button
              className="text-xs font-mono text-slate-600 hover:text-gold-400 hover:bg-slate-700 px-1.5 py-0.5 rounded transition-colors border border-transparent hover:border-slate-600"
              onClick={() => onDamage(combatant.id)}
              title="Apply damage/healing (T)"
            >
              T
            </button>
          </div>
        )}

        {/* Conditions */}
        {!isLair && (
          <div
            className="flex flex-wrap gap-1 items-center flex-1 min-w-0"
            onClick={(e) => e.stopPropagation()}
          >
            {combatant.conditions.map((cond) => (
              <span
                key={cond.id}
                className={`inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded ${cond.color}`}
              >
                {cond.name}
                <button
                  className="opacity-60 hover:opacity-100 leading-none ml-0.5"
                  onClick={() => onRemoveCondition(combatant.id, cond.id)}
                >
                  ×
                </button>
              </span>
            ))}

            {/* Add condition button */}
            <button
              className="text-xs text-slate-600 hover:text-slate-300 w-5 h-5 flex items-center justify-center rounded hover:bg-slate-700 transition-colors shrink-0"
              title="Add condition"
              onClick={(e) => {
                e.stopPropagation()
                setCondAnchor(condAnchor ? null : e.currentTarget.getBoundingClientRect())
              }}
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* ── Remove button (always full opacity) ───────────────────────── */}
      <button
        className="shrink-0 text-slate-700 hover:text-red-500 transition-colors leading-none ml-1 text-sm"
        onClick={(e) => { e.stopPropagation(); onRemove(combatant.id) }}
        title="Remove"
      >
        ✕
      </button>

      {/* ── Condition dropdown portal ──────────────────────────────────── */}
      {condAnchor && createPortal(
        <ConditionMenu
          anchor={condAnchor}
          onAdd={(cond) => {
            onAddCondition(combatant.id, { id: uid(), ...cond })
            setCondAnchor(null)
          }}
          onClose={() => setCondAnchor(null)}
        />,
        document.body
      )}
    </div>
  )
}

// ── Condition menu (portal) ───────────────────────────────────────────────────
function ConditionMenu({ anchor, onAdd, onClose }) {
  const [custom, setCustom] = useState('')
  const menuRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    const h = (e) => { if (!menuRef.current?.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const MENU_W = 180
  const MENU_MAX_H = 264

  const left = Math.min(anchor.left, window.innerWidth - MENU_W - 8)
  const spaceBelow = window.innerHeight - anchor.bottom
  const spaceAbove = anchor.top

  const posStyle = spaceBelow >= 160 || spaceBelow >= spaceAbove
    ? { top: anchor.bottom + 4, left, maxHeight: Math.min(MENU_MAX_H, spaceBelow - 8) }
    : { bottom: window.innerHeight - anchor.top + 4, left, maxHeight: Math.min(MENU_MAX_H, spaceAbove - 8) }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl overflow-y-auto"
      style={{ width: MENU_W, ...posStyle }}
    >
      <div className="py-1">
        {CONDITIONS.map((c) => (
          <button
            key={c.name}
            className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
            onClick={() => onAdd({ name: c.name, color: c.color })}
          >
            {c.name}
          </button>
        ))}
      </div>
      <div className="border-t border-slate-700 px-2 py-2">
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
            placeholder="Custom condition…"
            autoFocus
            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-gold-500 placeholder:text-slate-600"
          />
        </form>
      </div>
    </div>
  )
}

// ── Grip icon ─────────────────────────────────────────────────────────────────
function GripIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
      <circle cx="2" cy="2.5"  r="1.2" /><circle cx="8" cy="2.5"  r="1.2" />
      <circle cx="2" cy="7"    r="1.2" /><circle cx="8" cy="7"    r="1.2" />
      <circle cx="2" cy="11.5" r="1.2" /><circle cx="8" cy="11.5" r="1.2" />
    </svg>
  )
}
