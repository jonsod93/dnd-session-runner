import { useState, useEffect, useCallback, useRef } from 'react'
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'

import { useCombatState } from '../hooks/useCombatState'
import { useLibrary }      from '../hooks/useLibrary'
import { useIsMobile }     from '../hooks/useIsMobile'
import { useSpotify }      from '../hooks/useSpotify'
import { LeftPanel }       from '../components/combat/LeftPanel'
import { CombatantRow }    from '../components/combat/CombatantRow'
import { StatblockPanel }  from '../components/combat/StatblockPanel'
import { StatblockEditor } from '../components/combat/StatblockEditor'
import { InitiativeModal } from '../components/combat/InitiativeModal'
import { DamageModal }     from '../components/combat/DamageModal'
import { ConcentrationPrompt } from '../components/combat/ConcentrationPrompt'
import { ConditionExpiryPrompt } from '../components/combat/ConditionExpiryPrompt'
import { DiceRollToast }   from '../components/DiceRollToast'
import { NotificationToast, useNotifications } from '../components/NotificationToast'
import { SpellDrawer }     from '../components/SpellDrawer'
import { uid, d20, abilityMod } from '../utils/combatUtils'

export default function CombatTracker() {
  const combat = useCombatState()
  const library = useLibrary()
  const notifications = useNotifications()

  const isMobile = useIsMobile()
  const spotify  = useSpotify()
  const [mobileTab,           setMobileTab]           = useState('tracker') // 'tracker' | 'library'
  const [mobileStatblockId,   setMobileStatblockId]   = useState(null)

  const [selectedId,        setSelectedId]        = useState(null)
  const [showInitModal,     setShowInitModal]     = useState(false)
  const [damageTargetId,    setDamageTargetId]    = useState(null)
  const [showClearConfirm,  setShowClearConfirm]  = useState(false)
  const [rolls,             setRolls]             = useState([])
  const [activeSpell,       setActiveSpell]       = useState(null)
  const [leftCollapsed,     setLeftCollapsed]     = useState(false)
  const [customLairActions, setCustomLairActions] = useState([])
  const [concCheck,         setConcCheck]         = useState(null) // pending concentration check

  const mobileStatblockCombatant = combat.combatants.find((c) => c.id === mobileStatblockId) ?? null

  const listRef = useRef(null)

  // Auto-scroll the active combatant to the top of the list when the turn advances
  useEffect(() => {
    if (!combat.activeTurnId || !listRef.current) return
    const el = listRef.current.querySelector(`[data-combatant-id="${combat.activeTurnId}"]`)
    if (el) {
      const containerRect = listRef.current.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const shadowOffset = 22 // account for neumorphic shadow above the active row
      const newScrollTop = listRef.current.scrollTop + (elRect.top - containerRect.top) - shadowOffset
      listRef.current.scrollTo({ top: Math.max(0, newScrollTop), behavior: 'smooth' })
    }
  }, [combat.activeTurnId])

  // Editor state: { mode: 'new' } | { mode: 'edit', entry, customIndex }
  const [editor, setEditor] = useState(null)

  const selectedCombatant = combat.combatants.find((c) => c.id === selectedId) ?? null
  const damageTarget      = combat.combatants.find((c) => c.id === damageTargetId) ?? null

  // Deselect if selected combatant is removed
  useEffect(() => {
    if (selectedId && !combat.combatants.find((c) => c.id === selectedId)) {
      setSelectedId(null)
    }
  }, [combat.combatants, selectedId])

  // ── Dice roll handler ────────────────────────────────────────────────────
  const handleRoll = useCallback((result) => {
    setRolls((prev) => [...prev, { ...result, id: uid() }])
  }, [])

  const handleExpireRoll = useCallback((id) => {
    setRolls((prev) => prev.filter((r) => r.id !== id))
  }, [])

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); combat.nextTurn() }
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        // Target the selected (clicked) combatant, fall back to active turn
        const targetId = selectedId || combat.activeTurnId
        const target = combat.combatants.find((c) => c.id === targetId)
        if (target?.hp) setDamageTargetId(target.id)
      }
      if (e.key === 'Delete' && selectedId) {
        e.preventDefault()
        combat.remove(selectedId)
        setSelectedId(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [combat, selectedId])

  // ── Auto-process no-save condition expiries ─────────────────────────────
  useEffect(() => {
    const expiries = combat.pendingExpiries ?? []
    if (!expiries.length) return
    // Auto-resolve no-save expiries with a notification
    expiries.forEach((e) => {
      if (!e.condition.needsSave) {
        const c = combat.combatants.find((x) => x.id === e.combatantId)
        notifications.notify(`${e.condition.name} on ${c?.name ?? 'unknown'} has expired`, 'info')
        combat.resolveExpiry(e.combatantId, e.condition.id, false)
      }
    })
  }, [combat.pendingExpiries])

  // Save-required expiries that need modal prompts
  const saveExpiries = (combat.pendingExpiries ?? []).filter((e) => e.condition.needsSave)

  // ── Drag & drop ──────────────────────────────────────────────────────────
  const sensors = useSensors(
    // Mouse: activate after 5px movement
    useSensor(MouseSensor,    { activationConstraint: { distance: 5 } }),
    // Touch: activate after 250ms hold — avoids competing with page scroll
    useSensor(TouchSensor,    { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return

    const oldIdx  = combat.combatants.findIndex((c) => c.id === active.id)
    const newIdx  = combat.combatants.findIndex((c) => c.id === over.id)
    const newList = arrayMove(combat.combatants, oldIdx, newIdx)

    // Adopt the initiative of the combatant now above (fallback to below)
    const above = newIdx > 0 ? newList[newIdx - 1] : null
    const below = newList[newIdx + 1] ?? null
    const ref   = above ?? below

    combat.reorder(newList)
    if (ref?.initiative != null) {
      combat.setInitiatives({ [active.id]: ref.initiative })
    }
  }

  const hasLair = combat.combatants.some((c) => c.type === 'lair')

  // Initiative modal ordering: PCs → quick-add → monsters
  const initiativeCombatants = [
    ...combat.combatants.filter((c) => c.type === 'pc'),
    ...combat.combatants.filter((c) => c.type === 'quick'),
    ...combat.combatants.filter((c) => c.type !== 'lair' && c.type !== 'pc' && c.type !== 'quick'),
  ]

  return (
    <div className="flex neumorphic" style={{ height: 'calc(100vh - 48px)' }}>

      {/* ── Left panel ──────────────────────────────────────────────────── */}
      <div className={isMobile && mobileTab === 'tracker' ? 'hidden' : 'contents'}>
        <LeftPanel
          monsters={library.monsters}
          pcs={library.pcs}
          onAdd={(entry) => {
            if (entry.type === 'lair' && hasLair) return
            combat.add(entry)
          }}
          collapsed={!isMobile && leftCollapsed}
          onToggleCollapse={() => setLeftCollapsed((v) => !v)}
          onEditStatblock={(entry) => {
            setEditor({ mode: 'edit', entry })
          }}
          onNewStatblock={() => setEditor({ mode: 'new' })}
          onDeleteStatblock={async (name, _type, actualKey) => {
            try {
              await library.deleteCreature(name, actualKey)
              notifications.notify(`Deleted "${name}"`, 'success')
            } catch (err) {
              notifications.notify(`Failed to delete: ${err.message}`, 'error')
            }
          }}
          onSavePC={(name, originalName, ac) => {
            library.savePC(name, originalName, ac)
            notifications.notify(originalName ? `Updated "${name}"` : `Added PC "${name}"`, 'success')
          }}
          onDeletePC={(name) => {
            library.deletePC(name)
            notifications.notify(`Deleted PC "${name}"`, 'success')
          }}
        />      </div>

      {/* ── Centre: editor OR tracker ────────────────────────────────────── */}
      {editor ? (
        <StatblockEditor
          initial={editor.mode === 'edit' ? editor.entry : undefined}
          title={editor.mode === 'new' ? 'New Statblock' : `Edit: ${editor.entry?.Name}`}
          onSave={async (statblock) => {
            try {
              const originalKey = editor.mode === 'edit' ? editor.entry?._key : null
              await library.saveCreature(statblock, originalKey)
              notifications.notify(
                editor.mode === 'edit'
                  ? `Saved "${statblock.Name}"`
                  : `Created "${statblock.Name}"`,
                'success'
              )
              setEditor(null)
            } catch (err) {
              notifications.notify(`Failed to save: ${err.message}`, 'error')
            }
          }}
          onCancel={() => setEditor(null)}
        />
      ) : (
      <div className={`flex-1 flex flex-col min-w-0 ${isMobile && mobileTab === 'library' ? 'hidden' : ''}`}>

        {/* Toolbar */}
        <div className="shrink-0 px-5 py-2.5 border-b border-black/[0.15] flex items-center gap-3 min-h-[48px] bg-[var(--neu-bg-raised)]">
          <button
            onClick={() => {
              // Play sound effect — silent if file missing or autoplay blocked
              try { new Audio('/audio/roll-initiative.mp3').play() } catch { /* ignore */ }
              // Start Spotify playlist after 1s so the mp3 can play first
              const uri = import.meta.env.VITE_SPOTIFY_PLAYLIST_URI
              if (uri) setTimeout(() => spotify.play(uri), 1000)
              setShowInitModal(true)
            }}
            className="btn-action !text-sm !px-4 !py-2"
          >
            ⚔ Roll Initiative
          </button>

          <div className="flex-1" />

          <span className="text-xs text-[#6a6864] font-mono">
            {combat.combatants.filter((c) => c.type !== 'lair').length} combatants
          </span>

          {/* Spotify indicator — only shown when the feature is configured */}
          {spotify.enabled && (
            spotify.isConnected ? (
              <button
                onClick={spotify.disconnect}
                className="text-xs text-[#5a5854] hover:text-[#9a9894] transition-colors"
                title="Spotify connected — click to disconnect"
              >
                ♫
              </button>
            ) : (
              <button
                onClick={spotify.connect}
                className="text-xs text-[#4a4844] hover:text-[#9a9894] transition-colors"
                title="Connect Spotify"
              >
                Connect Spotify
              </button>
            )
          )}

          {showClearConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#7a7874]">Clear all?</span>
              <button
                onClick={() => { combat.clear(); setShowClearConfirm(false); setSelectedId(null) }}
                className="text-sm text-red-400/80 hover:text-red-400 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="text-sm text-[#9a9894] hover:text-[#e6e6e6] transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-sm text-[#908e8a] hover:text-[#e6e6e6] transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Header row — mobile (mirrors CombatantRow outer flex → content flex nesting) */}
        {combat.combatants.length > 0 && (
          <div className="lg:hidden shrink-0 flex items-center gap-2 mx-3 px-3 py-1.5 border-b border-black/[0.15] text-[10px] text-[#6a6864] uppercase tracking-wider font-medium bg-[var(--neu-bg-raised)]">
            {/* Initiative */}
            <div className="w-7 shrink-0 text-center">#</div>
            {/* Content — matches flex-1 content div in CombatantRow */}
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="flex-1 min-w-0">Name</span>
              <span className="shrink-0 w-16 text-right" title="Hit Points">
                <svg className="inline" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </span>
              <span className="shrink-0 w-8 text-right" title="Armor Class">
                <svg className="inline" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </span>
              {/* Invisible spacers matching Dmg + Cond buttons */}
              <span className="shrink-0 btn-action !text-[10px] !px-2 !py-1 invisible">Dmg</span>
              <span className="shrink-0 btn-action !text-[10px] !px-2 !py-1 invisible">Cond</span>
            </div>
            {/* Remove button spacer */}
            <div className="shrink-0 w-5" />
          </div>
        )}

        {/* Header row — desktop */}
        {combat.combatants.length > 0 && (
          <div className="max-lg:hidden shrink-0 flex items-center gap-2 mx-3 px-4 py-1.5 border-b border-black/[0.15] text-xs text-[#6a6864] uppercase tracking-wider font-medium bg-[var(--neu-bg-raised)]">
            {/* Drag handle spacer */}
            <div className="w-[10px] shrink-0" />
            {/* Active arrow spacer */}
            <div className="w-3 shrink-0" />
            {/* Initiative */}
            <div className="w-8 shrink-0 text-center">#</div>
            {/* Content column — mirrors row's flex-1 content div */}
            <div className="flex-1 min-w-0 flex items-center">
              <div className="w-36 shrink-0">Name</div>
              <div className="flex-1 flex items-center justify-center gap-4" style={{ transform: 'translateX(-13px)' }}>
                <div className="w-24 shrink-0 flex justify-center" title="Hit Points">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </div>
                <div className="w-14 shrink-0 flex justify-center" title="Armor Class">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                {/* Deal damage spacer to match row button */}
                <div className="shrink-0" style={{ width: 96 }} />
              </div>
              {/* Conditions button spacer */}
              <div className="w-[72px] shrink-0" />
            </div>
            {/* Remove button spacer */}
            <div className="w-4 shrink-0 ml-0.5" />
          </div>
        )}

        {/* Combatant list */}
        <div ref={listRef} className="flex-1 overflow-y-auto max-lg:pb-44 flex flex-col gap-2 p-3 bg-[var(--neu-bg-raised)]">
          {combat.combatants.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <p className="text-[#b8b5b0] text-sm mb-1">No combatants</p>
              <p className="text-[#908e8a] text-sm">
                Add from the library or use Other on the left.
              </p>
            </div>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={combat.combatants.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {combat.combatants.map((c) => (
                <CombatantRow
                  key={c.id}
                  combatant={c}
                  isActive={c.id === combat.activeTurnId}
                  isSelected={c.id === selectedId}
                  onSetActive={combat.setActive}
                  onRemove={(id) => {
                    combat.remove(id)
                    if (selectedId === id) setSelectedId(null)
                  }}
                  onDamage={setDamageTargetId}
                  onAddCondition={combat.addCondition}
                  onRemoveCondition={combat.removeCondition}
                  onSelect={(combatant) => {
                    if (combatant.type === 'pc') return
                    if (!isMobile && selectedId === combatant.id) return
                    const newId = selectedId === combatant.id ? null : combatant.id
                    setSelectedId(newId)
                    if (isMobile && combatant.statblock) setMobileStatblockId(combatant.id)
                  }}
                  onSetDeathSaves={combat.setDeathSaves}
                  onToggleDeathSaves={combat.toggleDeathSaves}
                  onNat20Heal={(id, isPC) => {
                    if (isPC) {
                      combat.setDeathSaves(id, 0, 0)
                      // Clear after brief delay to show the reset
                      setTimeout(() => combat.toggleDeathSaves(id), 100)
                    } else {
                      combat.applyDamage(id, -1)
                    }
                  }}
                  combatants={combat.combatants}
                  activeTurnId={combat.activeTurnId}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>
      )}

      {/* ── Right: statblock panel (desktop only) ───────────────────────── */}
      {!isMobile && (
        <StatblockPanel
          combatant={selectedCombatant}
          combatants={combat.combatants}
          onClear={() => setSelectedId(null)}
          onUsageChange={(key, value) => {
            if (selectedId) combat.updateUsage(selectedId, key, value)
          }}
          onRoll={handleRoll}
          onSpellClick={setActiveSpell}
          customLairActions={customLairActions}
          onAddCustomLairAction={(text) => setCustomLairActions((prev) => [...prev, text])}
          onRemoveCustomLairAction={(idx) => setCustomLairActions((prev) => prev.filter((_, i) => i !== idx))}
        />
      )}

      {/* ── Mobile: statblock overlay ────────────────────────────────────── */}
      {isMobile && mobileStatblockCombatant && (
        <StatblockPanel
          combatant={mobileStatblockCombatant}
          combatants={combat.combatants}
          onClear={() => { setMobileStatblockId(null); setSelectedId(null) }}
          onUsageChange={(key, value) => combat.updateUsage(mobileStatblockId, key, value)}
          onRoll={handleRoll}
          onSpellClick={setActiveSpell}
          customLairActions={customLairActions}
          onAddCustomLairAction={(text) => setCustomLairActions((prev) => [...prev, text])}
          onRemoveCustomLairAction={(idx) => setCustomLairActions((prev) => prev.filter((_, i) => i !== idx))}
          mobileOverlay
        />
      )}

      {/* ── Mobile: Next Turn button (fixed above tab bar) ───────────────── */}
      {isMobile && mobileTab === 'tracker' && (
        <div className="fixed bottom-14 left-0 right-0 z-40 px-3 py-2 pointer-events-none">
          <button
            onClick={combat.nextTurn}
            className="pointer-events-auto w-full py-3.5 btn-action !text-base !font-semibold !text-[#e6e6e6] !rounded-2xl"
          >
            Next Turn
          </button>
        </div>
      )}

      {/* ── Mobile: bottom tab bar ───────────────────────────────────────── */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex h-14 bg-[#2a2a2a] border-t border-black/[0.15]">
          {[
            { key: 'tracker', label: 'Tracker' },
            { key: 'library', label: 'Library' },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={[
                'flex-1 text-sm font-medium border-t-2 transition-colors',
                mobileTab === key
                  ? 'border-[#e87830] text-[#e6e6e6]'
                  : 'border-transparent text-[#9a9894] hover:text-[#e6e6e6]',
              ].join(' ')}
              onClick={() => setMobileTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {showInitModal && (
        <InitiativeModal
          combatants={initiativeCombatants}
          onConfirm={(map) => { combat.setInitiatives(map); setShowInitModal(false) }}
          onClose={() => setShowInitModal(false)}
        />
      )}

      {damageTarget && (
        <DamageModal
          combatant={damageTarget}
          onConfirm={(amount) => {
            // Check for concentration before applying damage
            if (amount > 0) {
              const target = combat.combatants.find((c) => c.id === damageTargetId)
              if (target) {
                const concCond = target.conditions.find((c) => c.name === 'Concentration')
                if (concCond) {
                  const tempHp = target.tempHp ?? 0
                  const damageToHp = Math.max(0, amount - tempHp)
                  if (damageToHp > 0) {
                    const dc = Math.max(10, Math.floor(damageToHp / 2))
                    const conMod = abilityMod(target.statblock?.Abilities?.Con ?? 10)
                    const roll = d20()
                    const total = roll + conMod
                    const success = total >= dc
                    const modStr = conMod >= 0 ? `+${conMod}` : String(conMod)
                    if (success) {
                      // Show as a toast like dice rolls - non-blocking
                      setRolls((prev) => [...prev, {
                        id: uid(),
                        context: 'Concentration maintained',
                        combatantName: target.name,
                        label: `DC ${dc}`,
                        detail: `d20(${roll})${modStr}`,
                        total,
                        rollType: 'save',
                      }])
                    } else {
                      setConcCheck({
                        combatantId: damageTargetId,
                        combatantName: target.name,
                        condId: concCond.id,
                        dc,
                        roll,
                        conMod,
                        total,
                        success: false,
                        spellName: concCond.spellName,
                      })
                    }
                  }
                }
              }
            }
            combat.applyDamage(damageTargetId, amount)
            setDamageTargetId(null)
          }}
          onClose={() => setDamageTargetId(null)}
          onSetTempHp={combat.setTempHp}
        />
      )}

      {/* Concentration check prompt */}
      {concCheck && (
        <ConcentrationPrompt
          check={concCheck}
          combatantName={concCheck.combatantName}
          onKeep={() => setConcCheck(null)}
          onDrop={() => {
            combat.removeCondition(concCheck.combatantId, concCheck.condId)
            setConcCheck(null)
          }}
          onClose={() => setConcCheck(null)}
        />
      )}

      {/* ── Condition expiry prompts (save-required) ────────────────────── */}
      {saveExpiries.length > 0 && (() => {
        const e = saveExpiries[0]
        const c = combat.combatants.find((x) => x.id === e.combatantId)
        return (
          <ConditionExpiryPrompt
            expiry={e}
            combatant={c}
            onKeep={() => combat.resolveExpiry(e.combatantId, e.condition.id, true)}
            onClear={() => combat.resolveExpiry(e.combatantId, e.condition.id, false)}
          />
        )
      })()}

      {/* ── Dice roll toast ──────────────────────────────────────────────── */}
      {rolls.length > 0 && (
        <DiceRollToast rolls={rolls} onExpire={handleExpireRoll} spellDrawerOpen={!!activeSpell} />
      )}

      {/* ── Spell drawer ─────────────────────────────────────────────────── */}
      {activeSpell && (
        <SpellDrawer spellName={activeSpell} onClose={() => setActiveSpell(null)} onRoll={handleRoll} />
      )}

      {/* ── Notifications ──────────────────────────────────────────────── */}
      <NotificationToast items={notifications.items} onExpire={notifications.expire} />
    </div>
  )
}
