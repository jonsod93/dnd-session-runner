import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CONDITIONS, uid } from '../../utils/combatUtils'
import { useIsMobile } from '../../hooks/useIsMobile'

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

  const nameColor = isLair ? 'text-red-400' : isPC ? 'text-green-400' : 'text-[#e6e6e6]'

  const openConditions = (e) => {
    e.stopPropagation()
    setCondAnchor(condAnchor ? null : e.currentTarget.getBoundingClientRect())
  }

  const conditionTags = !isLair ? combatant.conditions.map((cond) => (
    <span
      key={cond.id}
      className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded ${cond.color}`}
      title={cond.info || CONDITIONS.find((c) => c.name === cond.name)?.info || ''}
    >
      {cond.name}
      <button
        className="opacity-50 hover:opacity-100 leading-none ml-0.5"
        onClick={(e) => { e.stopPropagation(); onRemoveCondition(combatant.id, cond.id) }}
      >
        ×
      </button>
    </span>
  )) : []

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-combatant-id={combatant.id}
      className={[
        'flex items-center max-lg:items-start gap-2 px-4 py-3 border-b border-white/[0.04] border-l-2 transition-colors min-h-[52px] cursor-default',
        isActive
          ? 'border-l-gold-400 bg-white/[0.05]'
          : 'border-l-transparent max-lg:hover:bg-transparent hover:bg-white/[0.03]',
        isSelected && !isActive ? 'max-lg:bg-transparent bg-white/[0.05]' : '',
        isDragging ? 'opacity-40' : '',
      ].join(' ')}
      onClick={() => onSelect(combatant)}
    >
      {/* Drag handle */}
      <button
        {...(isLair ? {} : { ...attributes, ...listeners })}
        className={`shrink-0 text-white/20 max-lg:self-center ${isLair ? 'invisible pointer-events-none' : 'hover:text-white/40 cursor-grab active:cursor-grabbing'}`}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <GripIcon />
      </button>

      {/* Initiative */}
      <button
        className={`w-10 shrink-0 text-center font-mono text-3xl font-medium transition-colors max-lg:self-stretch max-lg:flex max-lg:items-center max-lg:justify-center ${isActive ? 'text-gold-400' : 'text-[#9a9894] hover:text-[#e6e6e6]'}`}
        onClick={(e) => { e.stopPropagation(); onSetActive(combatant.id) }}
        title="Set as active turn"
      >
        {combatant.initiative ?? '—'}
      </button>

      {/* ── Content column ────────────────────────────────────────────────── */}
      <div className={`flex-1 min-w-0 max-lg:pr-2 ${isDead ? 'opacity-40' : ''}`}>

        {/* ── Desktop layout (hidden on mobile) ─────────────────────────── */}
        <div className="max-lg:hidden flex items-center min-w-0">
          <span
            className={`w-36 shrink-0 text-sm font-medium truncate ${nameColor} ${isDead ? 'line-through' : ''}`}
            title={combatant.name}
          >
            {combatant.name}
          </span>
          <div className="flex items-center shrink-0 ml-[25px] gap-4">
            <div className="w-16 shrink-0 flex justify-center">
              {combatant.hp != null && (
                <span className="text-sm">
                  <span className="text-[#9a9894]">HP </span>
                  <span className={`font-mono font-medium ${hpColor}`}>{combatant.hp.current}/{combatant.hp.max}</span>
                </span>
              )}
            </div>
            <div className="w-14 shrink-0 flex justify-center">
              {combatant.ac != null && (
                <span className="text-sm">
                  <span className="text-[#9a9894]">AC </span>
                  <span className="font-mono font-medium text-[#e6e6e6]">{combatant.ac}</span>
                </span>
              )}
            </div>
          </div>
          {combatant.hp != null && (
            <button
              className="shrink-0 text-xs text-[#9a9894] hover:text-[#e6e6e6] hover:bg-white/[0.06] px-2 py-0.5 rounded transition-colors border border-white/[0.12]"
              onClick={(e) => { e.stopPropagation(); onDamage(combatant.id) }}
              title="Apply damage/healing (T)"
            >
              Deal damage
            </button>
          )}
          {!isLair && (
            <div className="flex-1 flex flex-wrap gap-1 items-center justify-end min-w-0 px-2">
              {conditionTags}
            </div>
          )}
          {isLair && <div className="flex-1" />}
        </div>

        {/* ── Mobile layout (hidden on desktop) ─────────────────────────── */}
        <div className="lg:hidden">
          {isLair ? (
            <span className={`text-sm font-medium ${nameColor}`}>{combatant.name}</span>
          ) : (
            <>
              {/*
                CSS grid with 2 columns: [1fr  auto]
                  Col 1 (1fr):  Name (row 1) and AC+HP (row 2) — left-aligned
                  Col 2 (auto): Conditions button (row 1) and Deal damage button (row 2)
                The "auto" column sizes to the widest child, so both buttons get equal width.
                "w-full" on each button fills that column width.
              */}
              <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5">
                {/* Row 1 col 1: Name */}
                <span
                  className={`text-sm font-medium truncate ${nameColor} ${isDead ? 'line-through' : ''}`}
                  title={combatant.name}
                >
                  {combatant.name}
                </span>

                {/* Row 1 col 2: Conditions button */}
                <button
                  className="w-full text-center text-xs text-[#9a9894] hover:text-[#e6e6e6] hover:bg-white/[0.04] px-2 py-1 rounded transition-colors border border-white/[0.12]"
                  onClick={openConditions}
                >
                  Conditions
                </button>

                {/* Row 2 col 1: HP + AC (only rendered when at least one exists) */}
                {(combatant.ac != null || combatant.hp != null) && (
                  <div className="flex items-center gap-2">
                    {combatant.hp != null && (
                      <span className="text-sm">
                        <span className="text-[#9a9894]">HP </span>
                        <span className={`font-mono font-medium ${hpColor}`}>{combatant.hp.current}/{combatant.hp.max}</span>
                      </span>
                    )}
                    {combatant.ac != null && (
                      <span className="text-sm">
                        <span className="text-[#9a9894]">AC </span>
                        <span className="font-mono font-medium text-[#e6e6e6]">{combatant.ac}</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Row 2 col 2: Deal damage button */}
                {combatant.hp != null && (
                  <button
                    className="w-full text-center text-xs text-[#9a9894] hover:text-[#e6e6e6] hover:bg-white/[0.04] px-2 py-1 rounded transition-colors border border-white/[0.12]"
                    onClick={(e) => { e.stopPropagation(); onDamage(combatant.id) }}
                  >
                    Deal damage
                  </button>
                )}
              </div>

              {/* Condition tags — full width, below the grid */}
              {conditionTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {conditionTags}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Conditions button — desktop only, right-aligned ─────────────── */}
      {!isLair && (
        <button
          className="max-lg:hidden shrink-0 text-xs text-[#9a9894] hover:text-[#e6e6e6] hover:bg-white/[0.06] px-2 py-1 rounded transition-colors border border-white/[0.12]"
          onClick={openConditions}
          title="Add/manage conditions"
        >
          Conditions
        </button>
      )}

      {/* Remove */}
      <button
        className="shrink-0 text-[#9a9894] hover:text-red-400 transition-colors leading-none text-sm ml-0.5 max-lg:self-center"
        onClick={(e) => { e.stopPropagation(); onRemove(combatant.id) }}
        title="Remove"
      >
        ✕
      </button>

      {/* Condition dropdown portal */}
      {condAnchor && createPortal(
        <ConditionMenu
          anchor={condAnchor}
          currentConditions={combatant.conditions}
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
function ConditionMenu({ anchor, onAdd, onClose, currentConditions = [] }) {
  const [custom, setCustom]     = useState('')
  const menuRef                 = useRef(null)
  const isMobile                = useIsMobile()

  const appliedNames        = new Set(currentConditions.map((c) => c.name))
  const availableConditions = CONDITIONS.filter((c) => !appliedNames.has(c.name))

  const handleCustomSubmit = (e) => {
    e.preventDefault()
    const t = custom.trim()
    if (t) onAdd({ name: t, color: 'bg-white/[0.08] text-[#e6e6e6]' })
    setCustom('')
  }

  // Desktop-only: close when clicking outside (hoisted above early return to satisfy Rules of Hooks)
  useEffect(() => {
    if (isMobile) return
    const h = (e) => { if (!menuRef.current?.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [isMobile, onClose])

  // ── Mobile: full bottom-sheet modal ────────────────────────────────────────
  if (isMobile) {
    return createPortal(
      <div
        className="fixed inset-0 z-[70] flex items-end justify-center"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      >
        <div
          className="bg-[#252525] border border-white/[0.1] rounded-t-xl w-full overflow-hidden flex flex-col"
          style={{ maxHeight: '80vh', boxShadow: '0 -4px 32px rgba(0,0,0,0.4)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative shrink-0 px-10 py-3 border-b border-white/[0.06] text-center">
            <p className="text-sm font-medium text-[#e6e6e6]">Add Condition</p>
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9894] hover:text-[#e6e6e6] transition-colors text-sm leading-none"
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          {/* Condition grid — scrollable */}
          <div className="overflow-y-auto p-3 flex-1">
            {availableConditions.length === 0 ? (
              <p className="text-center text-sm text-[#9a9894] py-4 italic">All conditions applied</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {availableConditions.map((c) => (
                  <button
                    key={c.name}
                    className="text-center px-3 py-2.5 text-sm text-[#e6e6e6] hover:bg-white/[0.08] border border-white/[0.12] rounded-lg transition-colors"
                    onClick={() => onAdd({ name: c.name, color: c.color, info: c.info || '' })}
                    title={c.info || ''}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custom condition — no autoFocus so the keyboard doesn't jump up */}
          <div className="shrink-0 border-t border-white/[0.06] px-3 py-3">
            <form onSubmit={handleCustomSubmit} className="flex gap-2">
              <input
                type="text"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Custom condition…"
                className="flex-1 bg-transparent border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-[#e6e6e6] focus:outline-none focus:border-gold-400 placeholder:text-[#9a9894] transition-colors"
              />
              <button
                type="submit"
                className="shrink-0 px-3 py-2 text-sm bg-gold-400/10 hover:bg-gold-400/20 text-gold-400 border border-gold-400/30 rounded-lg transition-colors"
              >
                Add
              </button>
            </form>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  // ── Desktop: small anchored popup ──────────────────────────────────────────
  const MENU_W     = 188
  const MENU_MAX_H = 272

  const left       = Math.min(anchor.right - MENU_W, window.innerWidth - MENU_W - 8)
  const spaceBelow = window.innerHeight - anchor.bottom
  const spaceAbove = anchor.top

  const posStyle = spaceBelow >= 160 || spaceBelow >= spaceAbove
    ? { top: anchor.bottom + 4,                     left, maxHeight: Math.min(MENU_MAX_H, spaceBelow - 8) }
    : { bottom: window.innerHeight - anchor.top + 4, left, maxHeight: Math.min(MENU_MAX_H, spaceAbove - 8) }

  return (
    <div
      ref={menuRef}
      className="fixed z-[70] bg-[#252525] border border-white/[0.1] rounded-lg shadow-xl overflow-y-auto"
      style={{ width: MENU_W, ...posStyle }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="py-1">
        {availableConditions.length === 0 ? (
          <p className="px-3 py-2 text-sm text-[#9a9894] italic">All conditions applied</p>
        ) : (
          availableConditions.map((c) => (
            <button
              key={c.name}
              className="w-full text-left px-3 py-1.5 text-sm text-[#e6e6e6] hover:bg-white/[0.06] transition-colors"
              onClick={() => onAdd({ name: c.name, color: c.color, info: c.info || '' })}
              title={c.info || ''}
            >
              {c.name}
            </button>
          ))
        )}
      </div>
      <div className="border-t border-white/[0.06] px-2 py-2">
        <form onSubmit={handleCustomSubmit}>
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Custom condition…"
            autoFocus
            className="w-full bg-transparent border-b border-white/[0.1] py-1 text-sm text-[#e6e6e6] focus:outline-none focus:border-gold-400 placeholder:text-[#9a9894] transition-colors"
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
