import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  PointerSensor,
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
import { LeftPanel }       from '../components/combat/LeftPanel'
import { CombatantRow }    from '../components/combat/CombatantRow'
import { StatblockPanel }  from '../components/combat/StatblockPanel'
import { StatblockEditor } from '../components/combat/StatblockEditor'
import { InitiativeModal } from '../components/combat/InitiativeModal'
import { DamageModal }     from '../components/combat/DamageModal'
import { DiceRollToast }   from '../components/DiceRollToast'
import { NotificationToast, useNotifications } from '../components/NotificationToast'
import { SpellDrawer }     from '../components/SpellDrawer'
import { uid }             from '../utils/combatUtils'

export default function CombatTracker() {
  const combat = useCombatState()
  const library = useLibrary()
  const notifications = useNotifications()

  const [selectedId,        setSelectedId]        = useState(null)
  const [showInitModal,     setShowInitModal]     = useState(false)
  const [damageTargetId,    setDamageTargetId]    = useState(null)
  const [showClearConfirm,  setShowClearConfirm]  = useState(false)
  const [rolls,             setRolls]             = useState([])
  const [activeSpell,       setActiveSpell]       = useState(null)
  const [leftCollapsed,     setLeftCollapsed]     = useState(false)
  const [customLairActions, setCustomLairActions] = useState([])

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

  // ── Drag & drop ──────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
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
    <div className="flex bg-[#1a1a1a]" style={{ height: 'calc(100vh - 48px)' }}>

      {/* ── Left panel ──────────────────────────────────────────────────── */}
      <LeftPanel
        monsters={library.monsters}
        pcs={library.pcs}
        onAdd={(entry) => {
          if (entry.type === 'lair' && hasLair) return
          combat.add(entry)
        }}
        collapsed={leftCollapsed}
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
      />

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
      <div className="flex-1 flex flex-col min-w-0 bg-[#1a1a1a]">

        {/* Toolbar */}
        <div className="shrink-0 px-5 py-2.5 border-b border-white/[0.06] flex items-center gap-3 min-h-[48px]">
          <button
            onClick={() => setShowInitModal(true)}
            className="bg-gold-400 hover:bg-gold-300 text-[#1a1a1a] font-semibold text-sm px-3 py-1.5 rounded transition-colors"
          >
            Roll Initiative
          </button>

          <button
            onClick={combat.nextTurn}
            className="text-sm text-[#9a9894] hover:text-[#e6e6e6] hover:bg-white/[0.04] px-3 py-1.5 rounded transition-colors"
            title="Next turn (N)"
          >
            Next Turn
            <span className="font-mono text-xs ml-1.5 text-[#9a9894]/60">[N]</span>
          </button>

          <div className="flex-1" />

          <span className="text-xs text-[#9a9894] font-mono">
            {combat.combatants.filter((c) => c.type !== 'lair').length} combatants
          </span>

          {showClearConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#9a9894]">Clear all?</span>
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
              className="text-sm text-[#9a9894]/50 hover:text-[#9a9894] transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Header row */}
        {combat.combatants.length > 0 && (
          <div className="shrink-0 flex items-center gap-2 px-4 py-1.5 border-b border-white/[0.08] text-xs text-[#9a9894] uppercase tracking-wider font-medium">
            {/* Drag handle spacer */}
            <div className="w-[10px] shrink-0" />
            {/* Active arrow spacer */}
            <div className="w-3 shrink-0" />
            {/* Initiative */}
            <div className="w-8 shrink-0 text-center">#</div>
            {/* Name */}
            <div className="w-36 shrink-0">Name</div>
            {/* AC + HP group */}
            <div className="flex items-center gap-4 shrink-0" style={{ marginLeft: 25 }}>
              <div className="w-14 flex justify-center" title="Armor Class">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className="w-[100px] flex" title="Hit Points">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
            </div>
            {/* Conditions spacer */}
            <div className="flex-1" />
            {/* Conditions button spacer */}
            <div className="w-[72px] shrink-0" />
            {/* Remove button spacer */}
            <div className="w-4 shrink-0 ml-0.5" />
          </div>
        )}

        {/* Combatant list */}
        <div className="flex-1 overflow-y-auto">
          {combat.combatants.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <p className="text-[#b8b5b0] text-sm mb-1">No combatants</p>
              <p className="text-[#b8b5b0]/50 text-sm">
                Add from the library or use Quick Add on the left.
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
                  onSelect={(combatant) =>
                    setSelectedId(selectedId === combatant.id ? null : combatant.id)
                  }
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>
      )}

      {/* ── Right: statblock panel ───────────────────────────────────────── */}
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
          onConfirm={(amount) => { combat.applyDamage(damageTargetId, amount); setDamageTargetId(null) }}
          onClose={() => setDamageTargetId(null)}
        />
      )}

      {/* ── Dice roll toast ──────────────────────────────────────────────── */}
      {rolls.length > 0 && (
        <DiceRollToast rolls={rolls} onExpire={handleExpireRoll} />
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
