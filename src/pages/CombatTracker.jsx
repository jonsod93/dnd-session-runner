import { useState, useEffect } from 'react'
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
import { LeftPanel }       from '../components/combat/LeftPanel'
import { CombatantRow }    from '../components/combat/CombatantRow'
import { StatblockPanel }  from '../components/combat/StatblockPanel'
import { InitiativeModal } from '../components/combat/InitiativeModal'
import { DamageModal }     from '../components/combat/DamageModal'

export default function CombatTracker() {
  const combat = useCombatState()

  const [selectedId,       setSelectedId]       = useState(null)
  const [showInitModal,    setShowInitModal]     = useState(false)
  const [damageTargetId,   setDamageTargetId]    = useState(null)
  const [showClearConfirm, setShowClearConfirm]  = useState(false)

  const selectedCombatant = combat.combatants.find((c) => c.id === selectedId) ?? null
  const damageTarget      = combat.combatants.find((c) => c.id === damageTargetId) ?? null

  // Deselect if selected combatant is removed
  useEffect(() => {
    if (selectedId && !combat.combatants.find((c) => c.id === selectedId)) {
      setSelectedId(null)
    }
  }, [combat.combatants, selectedId])

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); combat.nextTurn() }
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        const active = combat.combatants.find((c) => c.id === combat.activeTurnId)
        if (active?.hp) setDamageTargetId(active.id)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [combat])

  // ── Drag & drop ─────────────────────────────────────────────────────────
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

  // Quick-add combatants shown first in initiative modal
  const initiativeCombatants = [
    ...combat.combatants.filter((c) => c.type === 'quick'),
    ...combat.combatants.filter((c) => c.type !== 'lair' && c.type !== 'quick'),
  ]

  return (
    <div className="flex bg-[#1a1a1a]" style={{ height: 'calc(100vh - 48px)' }}>

      {/* ── Left panel ──────────────────────────────────────────────────── */}
      <LeftPanel
        onAdd={(entry) => {
          if (entry.type === 'lair' && hasLair) return
          combat.add(entry)
        }}
      />

      {/* ── Centre: tracker ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#1a1a1a]">

        {/* Toolbar */}
        <div className="shrink-0 px-5 py-2.5 border-b border-white/[0.06] flex items-center gap-3 min-h-[48px]">
          <button
            onClick={() => setShowInitModal(true)}
            className="bg-gold-400 hover:bg-gold-300 text-[#1a1a1a] font-semibold text-xs px-3 py-1.5 rounded transition-colors"
          >
            Roll Initiative
          </button>

          <button
            onClick={combat.nextTurn}
            className="text-sm text-[#787774] hover:text-[#e6e6e6] hover:bg-white/[0.04] px-3 py-1.5 rounded transition-colors"
            title="Next turn (N)"
          >
            Next Turn
            <span className="font-mono text-[10px] ml-1.5 text-[#787774]/60">[N]</span>
          </button>

          <div className="flex-1" />

          <span className="text-[11px] text-[#787774] font-mono">
            {combat.combatants.filter((c) => c.type !== 'lair').length} combatants
          </span>

          {showClearConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#787774]">Clear all?</span>
              <button
                onClick={() => { combat.clear(); setShowClearConfirm(false); setSelectedId(null) }}
                className="text-xs text-red-400/80 hover:text-red-400 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="text-xs text-[#787774] hover:text-[#e6e6e6] transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-xs text-[#787774]/50 hover:text-[#787774] transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Combatant list */}
        <div className="flex-1 overflow-y-auto">
          {combat.combatants.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <p className="text-[#787774] text-sm mb-1">No combatants</p>
              <p className="text-[#787774]/50 text-xs">
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

      {/* ── Right: statblock panel ───────────────────────────────────────── */}
      <StatblockPanel
        combatant={selectedCombatant}
        onClear={() => setSelectedId(null)}
        onUsageChange={(key, value) => {
          if (selectedId) combat.updateUsage(selectedId, key, value)
        }}
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
    </div>
  )
}
