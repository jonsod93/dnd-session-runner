import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CONDITIONS, uid } from '../../utils/combatUtils'

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
    hpPercent === null ? 'text-[#e6e6e6]' :
    hpPercent <= 0.25  ? 'text-red-400'   :
    hpPercent <= 0.5   ? 'text-amber-400'  :
                         'text-[#e6e6e6]'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'flex items-center gap-2 px-4 py-3 border-b border-white/[0.04] border-l-2 transition-colors min-h-[52px] cursor-default',
        isActive
          ? 'border-l-gold-400 bg-white/[0.05]'
          : 'border-l-transparent hover:bg-white/[0.03]',
        isSelected && !isActive ? 'bg-white/[0.05]' : '',
        isDragging ? 'opacity-40' : '',
      ].join(' ')}
      onClick={() => onSelect(combatant)}
    >
      {/* Drag handle */}
      <button
        {...(isLair ? {} : { ...attributes, ...listeners })}
        className={`shrink-0 text-white/20 ${isLair ? 'invisible pointer-events-none' : 'hover:text-white/40 cursor-grab active:cursor-grabbing'}`}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <GripIcon />
      </button>

      {/* Active arrow — ALWAYS full opacity, never faded */}
      <span className={`shrink-0 w-3 text-gold-400 text-xs leading-none ${isActive ? 'opacity-100' : 'opacity-0'}`}>
        ▶
      </span>

      {/* Initiative — ALWAYS full opacity */}
      <button
        className={`w-8 shrink-0 text-center font-mono text-sm font-medium transition-colors ${isActive ? 'text-gold-400' : 'text-[#787774] hover:text-[#e6e6e6]'}`}
        onClick={(e) => { e.stopPropagation(); onSetActive(combatant.id) }}
        title="Set as active turn"
      >
        {combatant.initiative ?? '—'}
      </button>

      {/* ── Faded content block ──────────────────────────────────────── */}
      <div className={`flex flex-1 items-center min-w-0 ${isDead ? 'opacity-40' : ''}`}>

        {/* Name — fixed width */}
        <span
          className={[
            'w-36 shrink-0 text-sm font-medium truncate',
            isLair ? 'text-[#787774] italic' : isPC ? 'text-blue-400' : 'text-[#e6e6e6]',
            isDead ? 'line-through' : '',
          ].join(' ')}
          title={combatant.name}
        >
          {combatant.name}
        </span>

        {/* Conditions — flex-1 spacer, shows tags when present */}
        {!isLair && (
          <div
            className="flex-1 flex flex-wrap gap-1 items-center min-w-0 px-2"
            onClick={(e) => e.stopPropagation()}
          >
            {combatant.conditions.map((cond) => (
              <span
                key={cond.id}
                className={`inline-flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded ${cond.color}`}
              >
                {cond.name}
                <button
                  className="opacity-50 hover:opacity-100 leading-none ml-0.5"
                  onClick={(e) => { e.stopPropagation(); onRemoveCondition(combatant.id, cond.id) }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {isLair && <div className="flex-1" />}

        {/* AC column — fixed width, always at same horizontal position */}
        <div className="w-14 shrink-0">
          {combatant.ac != null && (
            <span className="text-sm">
              <span className="text-[#787774] text-xs">AC </span>
              <span className="font-mono font-medium text-[#e6e6e6]">{combatant.ac}</span>
            </span>
          )}
        </div>

        {/* HP + T — fixed width */}
        <div
          className="w-[100px] shrink-0 flex items-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          {combatant.hp != null && (
            <>
              <span className={`text-sm font-mono font-medium ${hpColor}`}>
                {combatant.hp.current}/{combatant.hp.max}
              </span>
              <button
                className="text-[10px] font-mono text-[#787774] hover:text-[#e6e6e6] hover:bg-white/[0.06] px-1.5 py-0.5 rounded transition-colors"
                onClick={(e) => { e.stopPropagation(); onDamage(combatant.id) }}
                title="Apply damage/healing (T)"
              >
                T
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Conditions button — right-aligned, always full opacity ─────── */}
      {!isLair && (
        <button
          className="shrink-0 text-[11px] text-[#787774] hover:text-[#e6e6e6] hover:bg-white/[0.06] px-2 py-1 rounded transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            setCondAnchor(condAnchor ? null : e.currentTarget.getBoundingClientRect())
          }}
          title="Add/manage conditions"
        >
          Conditions
        </button>
      )}

      {/* Remove — always full opacity */}
      <button
        className="shrink-0 text-[#787774] hover:text-red-400 transition-colors leading-none text-sm ml-0.5"
        onClick={(e) => { e.stopPropagation(); onRemove(combatant.id) }}
        title="Remove"
      >
        ✕
      </button>

      {/* Condition dropdown portal */}
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

// ── Condition menu portal ─────────────────────────────────────────────────────
function ConditionMenu({ anchor, onAdd, onClose }) {
  const [custom, setCustom] = useState('')
  const menuRef = useRef(null)

  useEffect(() => {
    const h = (e) => { if (!menuRef.current?.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const MENU_W    = 188
  const MENU_MAX_H = 272

  const left       = Math.min(anchor.right - MENU_W, window.innerWidth - MENU_W - 8)
  const spaceBelow = window.innerHeight - anchor.bottom
  const spaceAbove = anchor.top

  const posStyle = spaceBelow >= 160 || spaceBelow >= spaceAbove
    ? { top: anchor.bottom + 4,                    left, maxHeight: Math.min(MENU_MAX_H, spaceBelow - 8) }
    : { bottom: window.innerHeight - anchor.top + 4, left, maxHeight: Math.min(MENU_MAX_H, spaceAbove - 8) }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-[#252525] border border-white/[0.1] rounded-lg shadow-xl overflow-y-auto"
      style={{ width: MENU_W, ...posStyle }}
    >
      <div className="py-1">
        {CONDITIONS.map((c) => (
          <button
            key={c.name}
            className="w-full text-left px-3 py-1.5 text-sm text-[#e6e6e6] hover:bg-white/[0.06] transition-colors"
            onClick={() => onAdd({ name: c.name, color: c.color })}
          >
            {c.name}
          </button>
        ))}
      </div>
      <div className="border-t border-white/[0.06] px-2 py-2">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const t = custom.trim()
            if (t) onAdd({ name: t, color: 'bg-white/[0.08] text-[#e6e6e6]' })
            setCustom('')
          }}
        >
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Custom condition…"
            autoFocus
            className="w-full bg-transparent border-b border-white/[0.1] py-1 text-sm text-[#e6e6e6] focus:outline-none focus:border-gold-400 placeholder:text-[#787774] transition-colors"
          />
        </form>
      </div>
    </div>
  )
}

function GripIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
      <circle cx="2" cy="2.5"  r="1.2" /><circle cx="8" cy="2.5"  r="1.2" />
      <circle cx="2" cy="7"    r="1.2" /><circle cx="8" cy="7"    r="1.2" />
      <circle cx="2" cy="11.5" r="1.2" /><circle cx="8" cy="11.5" r="1.2" />
    </svg>
  )
}
