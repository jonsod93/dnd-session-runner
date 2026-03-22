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

  const [selectedId,        setSelectedId]        = useState(null)
  const [showInitModal,     setShowInitModal]      = useState(false)
  const [damageTargetId,    setDamageTargetId]     = useState(null)
  const [showClearConfirm,  setShowClearConfirm]   = useState(false)

  const selectedCombatant = combat.combatants.find((c) => c.id === selectedId) ?? null
  const damageTarget      = combat.combatants.find((c) => c.id === damageTargetId) ?? null

  // Keep selectedId in sync — if selected combatant is removed, clear it
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
    const oldIdx = combat.combatants.findIndex((c) => c.id === active.id)
    const newIdx = combat.combatants.findIndex((c) => c.id === over.id)
    combat.reorder(arrayMove(combat.combatants, oldIdx, newIdx))
  }

  const hasLair = combat.combatants.some((c) => c.type === 'lair')

  return (
    <div className="flex" style={{ height: 'calc(100vh - 56px)' }}>

      {/* ── Left panel ──────────────────────────────────────────────────── */}
      <LeftPanel
        onAdd={(entry) => {
          if (entry.type === 'lair' && hasLair) return
          combat.add(entry)
        }}
      />

      {/* ── Centre: tracker ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Toolbar */}
        <div className="shrink-0 px-4 py-2 border-b border-slate-800 bg-slate-950 flex items-center gap-2 flex-wrap min-h-[52px]">
          <button
            onClick={() => setShowInitModal(true)}
            className="bg-gold-500 hover:bg-gold-400 text-slate-950 font-semibold font-display text-xs uppercase tracking-widest px-4 py-2 rounded transition-colors"
          >
            Roll Initiative
          </button>

          <button
            onClick={combat.nextTurn}
            className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm px-4 py-2 rounded transition-colors"
            title="Next turn (N)"
          >
            Next Turn <span className="text-slate-500 font-mono text-xs ml-1">[N]</span>
          </button>

          <div className="flex-1" />

          <span className="text-slate-600 text-xs font-mono">
            {combat.combatants.filter((c) => c.type !== 'lair').length} combatants
          </span>

          {showClearConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Clear all?</span>
              <button
                onClick={() => {
                  combat.clear()
                  setShowClearConfirm(false)
                  setSelectedId(null)
                }}
                className="text-xs text-red-400 hover:text-red-300 border border-red-800 hover:border-red-600 rounded px-2 py-1 transition-colors"
              >
                Yes, clear
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Combatant list */}
        <div className="flex-1 overflow-y-auto">
          {combat.combatants.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <p className="text-slate-600 text-sm mb-1">No combatants yet</p>
              <p className="text-slate-700 text-xs">
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

      {/* ── Right: statblock panel (always rendered) ─────────────────────── */}
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
          combatants={combat.combatants.filter((c) => c.type !== 'lair')}
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
