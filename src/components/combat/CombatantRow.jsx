import { useState, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { createPortal } from 'react-dom'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CONDITIONS, uid } from '../../utils/combatUtils'
import { useIsMobile } from '../../hooks/useIsMobile'
import { DeathSaveTracker } from './DeathSaveTracker'
import shieldNeutral from '../../assets/shield-ac-neutral.svg'
import shieldHovered from '../../assets/shield-ac-hovered.svg'
import shieldSelected from '../../assets/shield-ac-selected.svg'
import shieldHoveredSelected from '../../assets/shield-ac-hovered-and-selected.svg'

function SkullIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.5 2 2 6.5 2 12c0 3.5 1.8 6.5 4.5 8.3V22a1 1 0 001 1h9a1 1 0 001-1v-1.7C20.2 18.5 22 15.5 22 12c0-5.5-4.5-10-10-10zM9 13.5a2 2 0 100-4 2 2 0 000 4zm6 0a2 2 0 100-4 2 2 0 000 4zm-5 2.5a1 1 0 112 0 1 1 0 01-2 0zm3 0a1 1 0 112 0 1 1 0 01-2 0z"/>
    </svg>
  )
}

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
  onSetDeathSaves,
  onToggleDeathSaves,
  onNat20Heal,
  combatants,
  activeTurnId,
}) {
  const [condAnchor, setCondAnchor] = useState(null)

  const isLair = combatant.type === 'lair'
  const isPC   = combatant.type === 'pc'
  const isDead = combatant.hp?.current === 0
  const showDeathSaves = combatant.deathSaves != null && !isLair
  const tempHp = combatant.tempHp ?? 0

  const isMobile = useIsMobile()

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: combatant.id,
    disabled: isLair,
  })

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
    zIndex: isDragging ? 10 : undefined,
  }

  // ── HP countdown animation ─────────────────────────────────────────────────
  const [displayHp, setDisplayHp] = useState(combatant.hp?.current ?? 0)
  const hpProxyRef = useRef({ value: combatant.hp?.current ?? 0 })

  useEffect(() => {
    const target = combatant.hp?.current ?? 0
    if (hpProxyRef.current.value === target) {
      setDisplayHp(target)
      return
    }
    const tween = gsap.to(hpProxyRef.current, {
      value: target,
      duration: 0.5,
      ease: 'power2.out',
      onUpdate: () => setDisplayHp(Math.round(hpProxyRef.current.value)),
      onComplete: () => setDisplayHp(target),
    })
    return () => tween.kill()
  }, [combatant.hp?.current])

  const hpPercent = combatant.hp ? combatant.hp.current / combatant.hp.max : null
  const hpColor =
    hpPercent === null ? 'text-[#e6e6e6]' :
    hpPercent <= 0.25  ? 'text-[rgb(255,90,90)]'   :
    hpPercent <= 0.5   ? 'text-amber-400'  :
                         'text-[#e6e6e6]'

  const nameColor = isLair ? 'text-[#e6e6e6]' : isActive ? 'text-[#e87830]' : 'text-[#e6e6e6]'

  const openConditions = (e) => {
    e.stopPropagation()
    setCondAnchor(condAnchor ? null : e.currentTarget.getBoundingClientRect())
  }

  const conditionTags = !isLair ? combatant.conditions.map((cond) => {
    const baseInfo = cond.info || CONDITIONS.find((c) => c.name === cond.name)?.info || ''
    const spellInfo = cond.name === 'Concentration' && cond.spellName ? `Concentration: ${cond.spellName}` : ''
    const expiryTarget = cond.expiry ? combatants?.find((c) => c.id === cond.expiry.targetId) : null
    const expiryInfo = cond.expiry
      ? `Expires: ${cond.expiry.type === 'end_of_turn' ? 'end' : 'start'} of ${expiryTarget?.name ?? 'unknown'}'s turn${cond.needsSave ? ' (save)' : ''}`
      : ''
    const title = [spellInfo, baseInfo, expiryInfo].filter(Boolean).join('\n')
    const label = cond.name === 'Concentration' && cond.spellName
      ? `${cond.name}: ${cond.spellName}`
      : cond.name

    return (
      <span
        key={cond.id}
        className={`inline-flex items-center gap-0.5 text-xs px-2 py-1 rounded-lg condition-badge ${cond.color}`}
        title={title}
      >
        {cond.expiry && <ClockIcon className="w-3 h-3 opacity-50 shrink-0" />}
        {label}
        <button
          className="opacity-50 hover:opacity-100 leading-none ml-0.5 text-base -my-2 py-2"
          onClick={(e) => { e.stopPropagation(); onRemoveCondition(combatant.id, cond.id) }}
        >
          ×
        </button>
      </span>
    )
  }) : []

  return (
    <div
      ref={setNodeRef}
      style={sortableStyle}
      data-combatant-id={combatant.id}
      className={[
        'flex items-start max-lg:items-center gap-2 px-4 py-4 max-lg:px-3 max-lg:py-2 rounded-xl min-h-[56px] max-lg:min-h-0 shrink-0 cursor-default outline-none',
        isActive
          ? `active-border${isSelected ? ' is-selected' : ''}`
          : isLair
            ? `lair-border${isSelected ? ' is-selected' : ''}`
            : `combat-card${isSelected ? ' is-selected' : ''}`,
        isDragging ? 'opacity-40' : '',
      ].join(' ')}
      {...(!isLair ? { ...attributes, ...listeners } : {})}
      onClick={() => onSelect(combatant)}
    >
      {/* Active arrow — desktop only, invisible placeholder on inactive rows */}
      <span className={`max-lg:hidden shrink-0 self-center w-3 text-xs leading-none ${isActive ? 'text-[#e87830]' : 'invisible'}`}>
        ▶
      </span>

      {/* Initiative */}
      <button
        className={`shrink-0 self-center text-center font-mono transition-colors w-8 text-sm max-lg:w-7 max-lg:text-sm ${isActive ? 'text-[#e87830] font-medium' : 'text-[#9a9894] font-medium hover:text-[#e6e6e6]'}`}
        onClick={(e) => { e.stopPropagation(); onSetActive(combatant.id) }}
        title="Set as active turn"
      >
        {combatant.initiative ?? '—'}
      </button>

      {/* ── Content column ────────────────────────────────────────────────── */}
      <div className={`flex-1 min-w-0 ${isLair ? 'self-center' : ''}`}>

        {/* ── Desktop layout (hidden on mobile) ─────────────────────────── */}
        <div className="max-lg:hidden">
          <div className="flex items-center min-w-0">
            <span className="w-36 shrink-0 flex items-center gap-1">
              <span
                className={`text-sm font-semibold truncate ${nameColor} ${isDead ? 'opacity-40' : ''}`}
                title={combatant.name}
              >
                {combatant.name}
              </span>
              {isPC && (
                <button
                  className={`shrink-0 text-base leading-none transition-colors ${combatant.deathSaves ? 'text-red-500' : 'text-white/15 hover:text-red-500/60'}`}
                  onClick={(e) => { e.stopPropagation(); onToggleDeathSaves?.(combatant.id) }}
                  title={combatant.deathSaves ? 'Hide death saves' : 'Track death saves'}
                >
                  <SkullIcon className="w-4 h-4" />
                </button>
              )}
            </span>
            <div className="shrink-0 flex items-center gap-4">
              <div className="w-10 shrink-0 flex justify-center">
                {combatant.ac != null && (
                  <ShieldAC value={combatant.ac} large />
                )}
              </div>
              <div className="w-28 shrink-0 flex justify-center">
                {combatant.hp != null && (
                  <button
                    className="group/hp btn-action whitespace-nowrap flex items-center gap-1"
                    onClick={(e) => { e.stopPropagation(); onDamage(combatant.id) }}
                    title="Apply damage/healing (T)"
                  >
                    <span className="text-[#9a9894] group-hover/hp:text-[#e6e6e6] transition-colors">HP </span>
                    <span className={`font-mono ${hpColor} ${isDead ? 'opacity-40' : ''}`} style={{ fontWeight: 550 }}>{displayHp}/{combatant.hp.max}</span>
                    {tempHp > 0 && (
                      <span className="text-blue-400 font-mono text-xs" title="Temporary HP">+{tempHp}</span>
                    )}
                  </button>
                )}
              </div>
            </div>
            {!isLair && conditionTags.length > 0 && (
              <div className="flex flex-wrap gap-1 items-center ml-3 min-w-0">
                {conditionTags}
              </div>
            )}
            {!isLair && (
              <button
                className="shrink-0 btn-action ml-auto"
                onClick={openConditions}
                title="Add/manage conditions"
              >
                <TagIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          {showDeathSaves && (
            <DeathSaveTracker
              deathSaves={combatant.deathSaves}
              onUpdate={(s, f) => onSetDeathSaves?.(combatant.id, s, f)}
              onNat20={() => onNat20Heal?.(combatant.id, isPC)}
              onNat1={() => {
                const newF = Math.min(3, combatant.deathSaves.failures + 2)
                onSetDeathSaves?.(combatant.id, combatant.deathSaves.successes, newF)
              }}
              isPC={isPC}
            />
          )}
        </div>

        {/* ── Mobile layout (hidden on desktop) ─────────────────────────── */}
        <div className="lg:hidden">
          {isLair ? (
            <span className={`text-xs font-semibold ${nameColor}`}>{combatant.name}</span>
          ) : (
            <>
              {/* Single-row layout: Name | AC | HP | Cond */}
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 min-w-0 flex-1 max-w-[14ch]">
                  <span
                    className={`text-xs font-semibold truncate ${nameColor} ${isDead ? 'opacity-40' : ''}`}
                    title={combatant.name}
                  >
                    {combatant.name}
                  </span>
                  {isPC && (
                    <button
                      className={`shrink-0 leading-none transition-colors ${combatant.deathSaves ? 'text-red-500' : 'text-white/15 hover:text-red-500/60'}`}
                      onClick={(e) => { e.stopPropagation(); onToggleDeathSaves?.(combatant.id) }}
                    >
                      <SkullIcon className="w-3 h-3" />
                    </button>
                  )}
                </span>

                <span className="shrink-0 w-7 flex justify-center text-[11px]">
                  {combatant.ac != null && (
                    <ShieldAC value={combatant.ac} />
                  )}
                </span>

                <span className="shrink-0 w-[72px]">
                  {combatant.hp != null && (
                    <button
                      className="w-full btn-action !text-[11px] !px-2 !py-1 !rounded-lg text-center"
                      onClick={(e) => { e.stopPropagation(); onDamage(combatant.id) }}
                      title="Apply damage/healing"
                    >
                      <span className="inline-flex items-center gap-0.5">
                        <span className={`font-mono ${hpColor} ${isDead ? 'opacity-40' : ''}`} style={{ fontWeight: 550 }}>{displayHp}/{combatant.hp.max}</span>
                        {tempHp > 0 && (
                          <span className="text-blue-400 font-mono text-[10px]">+{tempHp}</span>
                        )}
                      </span>
                    </button>
                  )}
                </span>

                <button
                  className="shrink-0 btn-action !px-2 !py-1"
                  onClick={openConditions}
                  title="Add/manage conditions"
                >
                  <TagIcon className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Condition tags — full width, below the row */}
              {conditionTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {conditionTags}
                </div>
              )}
              {showDeathSaves && (
                <DeathSaveTracker
                  deathSaves={combatant.deathSaves}
                  onUpdate={(s, f) => onSetDeathSaves?.(combatant.id, s, f)}
                  onNat20={() => onNat20Heal?.(combatant.id, isPC)}
                  onNat1={() => {
                    const newF = Math.min(3, combatant.deathSaves.failures + 2)
                    onSetDeathSaves?.(combatant.id, combatant.deathSaves.successes, newF)
                  }}
                  isPC={isPC}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Remove */}
      <button
        className="shrink-0 self-center btn-action !w-7 !h-7 max-lg:!w-5 max-lg:!h-5 !p-0 flex items-center justify-center text-[9px] max-lg:text-[7px] text-[#5a5854] hover:!text-red-400 transition-all"
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
            // Resolve '__self__' expiry targetId to the actual combatant id
            const resolved = cond.expiry?.targetId === '__self__'
              ? { ...cond, expiry: { ...cond.expiry, targetId: combatant.id } }
              : cond
            onAddCondition(combatant.id, { id: uid(), ...resolved })
            setCondAnchor(null)
          }}
          onClose={() => setCondAnchor(null)}
          combatants={combatants}
          activeTurnId={activeTurnId}
        />,
        document.body
      )}
    </div>
  )
}

// ── Condition menu portal ─────────────────────────────────────────────────────
function ConditionMenu({ anchor, onAdd, onClose, currentConditions = [], combatants, activeTurnId }) {
  const [custom, setCustom]               = useState('')
  const [selectedCondition, setSelectedCondition] = useState(null) // condition object for DurationPicker / Concentration prompt
  const [spellName, setSpellName]         = useState('')
  const [withDuration, setWithDuration]   = useState(false)
  const menuRef                           = useRef(null)
  const isMobile                          = useIsMobile()

  const appliedNames        = new Set(currentConditions.map((c) => c.name))
  const availableConditions = CONDITIONS.filter((c) => !appliedNames.has(c.name))

  const handleConditionClick = (c) => {
    if (c.name === 'Concentration') {
      setSelectedCondition(c)
      return
    }
    if (isMobile && withDuration) {
      setSelectedCondition(c)
      return
    }
    if (isMobile) {
      // Mobile without duration: add immediately
      onAdd({ name: c.name, color: c.color, info: c.info || '' })
      return
    }
    // Desktop: add immediately with no duration
    onAdd({ name: c.name, color: c.color, info: c.info || '' })
  }

  const handleClockClick = (e, c) => {
    e.stopPropagation()
    setSelectedCondition(c)
  }

  const handleConcentrationAdd = () => {
    onAdd({ name: 'Concentration', color: selectedCondition.color, info: selectedCondition.info || '', spellName: spellName.trim() || null })
    setSpellName('')
    setSelectedCondition(null)
  }

  const handleCustomSubmit = (e) => {
    e.preventDefault()
    const t = custom.trim()
    if (t) onAdd({ name: t, color: 'bg-[#202226] text-[#e6e6e6]' })
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
        className="fixed inset-0 z-[70] flex items-end justify-center neumorphic"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      >
        <div
          className="glass-toast rounded-t-xl w-full overflow-hidden flex flex-col"
          style={{ maxHeight: '80vh', background: 'rgba(62, 62, 62, 0.65)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative shrink-0 px-4 py-3 border-b border-black/[0.15] flex items-center">
            <label
              className="flex items-center gap-1.5 cursor-pointer select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={withDuration}
                onChange={(e) => setWithDuration(e.target.checked)}
                className="accent-[#d4a843] w-3.5 h-3.5"
              />
              <span className={`text-xs transition-colors ${withDuration ? 'text-gold-400' : 'text-[#9a9894]'}`}>Duration</span>
            </label>
            <p className="text-sm font-medium text-[#e6e6e6] flex-1 text-center">Add Condition</p>
            <button
              className="text-[#9a9894] hover:text-[#e6e6e6] transition-colors text-sm leading-none"
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          {/* Condition grid / sub-panel — scrollable */}
          <div className="overflow-y-auto p-3 flex-1">
            {selectedCondition ? (
              <ConditionSubPanel
                condition={selectedCondition}
                spellName={spellName}
                setSpellName={setSpellName}
                onConcentrationAdd={handleConcentrationAdd}
                onAdd={onAdd}
                onBack={() => { setSelectedCondition(null); setSpellName('') }}
                combatants={combatants}
                activeTurnId={activeTurnId}
                mobile
              />
            ) : availableConditions.length === 0 ? (
              <p className="text-center text-sm text-[#9a9894] py-4 italic">All conditions applied</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {availableConditions.map((c) => (
                  <button
                    key={c.name}
                    className="text-center px-3 py-2.5 text-sm text-[#e6e6e6] library-card hover:!bg-[#202226]"
                    onClick={() => handleConditionClick(c)}
                    title={c.info || ''}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custom condition — no autoFocus so the keyboard doesn't jump up */}
          {!selectedCondition && (
          <div className="shrink-0 border-t border-black/[0.15] px-3 py-3">
            <form onSubmit={handleCustomSubmit} className="flex gap-2">
              <input
                type="text"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Custom condition..."
                className="input-field flex-1"
              />
              <button
                type="submit"
                className="shrink-0 btn-action !text-sm !px-3 !py-2 !text-white !font-semibold"
              >
                Add
              </button>
            </form>
          </div>
          )}
        </div>
      </div>,
      document.body
    )
  }

  // ── Desktop: small anchored popup ──────────────────────────────────────────
  const MENU_W     = selectedCondition ? 340 : 210
  const MENU_MAX_H = 400

  const left       = Math.min(anchor.right - MENU_W, window.innerWidth - MENU_W - 8)
  const spaceBelow = window.innerHeight - anchor.bottom
  const spaceAbove = anchor.top

  const posStyle = spaceBelow >= 160 || spaceBelow >= spaceAbove
    ? { top: anchor.bottom + 4,                     left, maxHeight: Math.min(MENU_MAX_H, spaceBelow - 8) }
    : { bottom: window.innerHeight - anchor.top + 4, left, maxHeight: Math.min(MENU_MAX_H, spaceAbove - 8) }

  return (
    <div
      ref={menuRef}
      className="fixed z-[70] glass-toast rounded-xl overflow-y-auto neumorphic"
      style={{ width: MENU_W, ...posStyle, background: 'rgba(62, 62, 62, 0.65)' }}
      onClick={(e) => e.stopPropagation()}
    >
      {selectedCondition ? (
        <div className="p-2">
          <ConditionSubPanel
            condition={selectedCondition}
            spellName={spellName}
            setSpellName={setSpellName}
            onConcentrationAdd={handleConcentrationAdd}
            onAdd={onAdd}
            onBack={() => { setSelectedCondition(null); setSpellName('') }}
            combatants={combatants}
            activeTurnId={activeTurnId}
          />
        </div>
      ) : (
        <>
          <div className="py-1">
            {availableConditions.length === 0 ? (
              <p className="px-3 py-2 text-sm text-[#9a9894] italic">All conditions applied</p>
            ) : (
              availableConditions.map((c) => (
                <button
                  key={c.name}
                  className="group w-full text-left px-3 py-1.5 text-sm text-[#e6e6e6] hover:bg-[#202226] rounded-lg transition-all flex items-center"
                  onClick={() => handleConditionClick(c)}
                  title={c.info || ''}
                >
                  <span className="flex-1">{c.name}</span>
                  {c.name !== 'Concentration' && (
                    <span
                      className="opacity-0 group-hover:opacity-60 hover:!opacity-100 ml-2 transition-opacity"
                      onClick={(e) => handleClockClick(e, c)}
                      title="Set duration"
                    >
                      <ClockIcon className="w-3.5 h-3.5" />
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
          <div className="border-t border-black/[0.15] px-3 py-2">
            <form onSubmit={handleCustomSubmit} className="flex gap-1.5 items-center">
              <input
                type="text"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Custom..."
                className="flex-1 min-w-0 bg-transparent border-b border-black/[0.2] py-1 text-sm text-[#e6e6e6] focus:outline-none focus:border-gold-400 placeholder:text-[#5a5854] transition-all"
              />
              <button
                type="submit"
                className="shrink-0 btn-action !text-xs !px-2.5 !py-1 !text-white !font-semibold"
              >
                Add
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}

// ── Condition sub-panel (Concentration spell name + DurationPicker) ──────────
function ConditionSubPanel({ condition, spellName, setSpellName, onConcentrationAdd, onAdd, onBack, combatants, activeTurnId, mobile }) {
  const [timing, setTiming]     = useState('end')    // 'end' | 'start'
  const [target, setTarget]     = useState('own')     // 'own' | 'inflicter'
  const [removal, setRemoval]   = useState('auto')    // 'auto' | 'save'

  const isConcentration = condition.name === 'Concentration'

  const activeCombatant = combatants?.find((c) => c.id === activeTurnId)

  const handleDurationAdd = () => {
    onAdd({
      name: condition.name,
      color: condition.color,
      info: condition.info || '',
      expiry: {
        type: timing === 'end' ? 'end_of_turn' : 'start_of_turn',
        targetId: target === 'own' ? '__self__' : activeTurnId,
      },
      needsSave: removal === 'save',
    })
  }

  if (isConcentration) {
    return (
      <div className="space-y-2">
        <button
          className="text-xs text-[#9a9894] hover:text-[#e6e6e6] transition-colors"
          onClick={onBack}
        >
          ← Back
        </button>
        <p className="text-sm text-[#e6e6e6] font-medium">Concentration</p>
        <input
          type="text"
          value={spellName}
          onChange={(e) => setSpellName(e.target.value)}
          placeholder="Spell name (optional)"
          className="input-field !border-blue-400/20 focus:!border-blue-400/50"
          autoFocus={!mobile}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onConcentrationAdd() } }}
        />
        <button
          onClick={onConcentrationAdd}
          className="w-full text-sm text-blue-400 border border-blue-400/30 hover:bg-blue-400/10 rounded-xl px-3 py-1.5 transition-all hover:shadow-neon-blue"
        >
          Add Concentration
        </button>
      </div>
    )
  }

  // Non-Concentration: Duration toggles
  return (
    <div className="space-y-2">
      <button
        className="text-xs text-[#9a9894] hover:text-[#e6e6e6] transition-colors"
        onClick={onBack}
      >
        ← Back
      </button>
      <p className="text-sm text-[#e6e6e6] font-medium">{condition.name}</p>

      <div className="flex flex-wrap gap-1.5">
        <SegmentedToggle
          options={[
            { value: 'end', label: 'End of' },
            { value: 'start', label: 'Start of' },
          ]}
          value={timing}
          onChange={setTiming}
        />
        <SegmentedToggle
          options={[
            { value: 'own', label: 'Own turn' },
            ...(activeCombatant ? [{ value: 'inflicter', label: `${activeCombatant.name}'s turn` }] : []),
          ]}
          value={target}
          onChange={setTarget}
        />
        <SegmentedToggle
          options={[
            { value: 'auto', label: 'Auto remove' },
            { value: 'save', label: 'Saving Throw' },
          ]}
          value={removal}
          onChange={setRemoval}
        />
      </div>

      <button
        onClick={handleDurationAdd}
        className="w-full text-sm text-gold-400 border border-gold-400/30 hover:bg-gold-400/10 rounded-xl px-3 py-1.5 transition-all hover:shadow-neon-gold"
      >
        Add {condition.name}
      </button>
    </div>
  )
}

const SHIELD_STROKE_PATH = 'M0 4.40484V18.1254C0 29.456 15.1399 36 15.1399 36C15.1399 36 29.9954 29.8332 29.9954 18.0892C29.9954 6.35201 30 4.40259 30 4.40259C30 4.40259 23.3459 0 15.1399 0C6.93393 0 0 4.40484 0 4.40484Z'

function ShieldAC({ value, large }) {
  const w = large ? 28 : 23
  const h = large ? 34 : 28
  return (
    <span className="shield-ac relative inline-flex items-center justify-center" style={{ width: w, height: h }}>
      <img className="shield-neutral absolute inset-0" src={shieldNeutral} width={w} height={h} alt="" />
      <img className="shield-hovered absolute inset-0 hidden" src={shieldHovered} width={w} height={h} alt="" />
      <img className="shield-selected absolute inset-0 hidden" src={shieldSelected} width={w} height={h} alt="" />
      <img className="shield-hovered-selected absolute inset-0 hidden" src={shieldHoveredSelected} width={w} height={h} alt="" />
      <svg className="absolute inset-0 pointer-events-none" width={w} height={h} viewBox="0 0 30 36" fill="none">
        <path d={SHIELD_STROKE_PATH} className="shield-border" strokeWidth="1.5" fill="none" />
      </svg>
      <span className="relative font-mono text-[#e6e6e6] text-xs" style={{ marginTop: -1, fontWeight: 550 }}>{value}</span>
    </span>
  )
}

function TagIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="1em" height="1em">
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
  )
}

function ClockIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="1em" height="1em">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function SegmentedToggle({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-white/[0.12] overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          className={`text-[10px] px-2 py-1 transition-colors whitespace-nowrap ${
            value === opt.value
              ? 'bg-gold-400/15 text-gold-400'
              : 'text-[#9a9894] hover:text-[#e6e6e6] hover:bg-[#202226]'
          }`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

