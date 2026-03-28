import { useState, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { StatblockBody } from './StatblockPanel'
import { SpellDrawer } from '../SpellDrawer'
import { useIsMobile } from '../../hooks/useIsMobile'

export function LeftPanel({ onAdd, collapsed, onToggleCollapse, onEditStatblock, onNewStatblock, onDeleteStatblock, monsters, pcs }) {
  const isMobile = useIsMobile()
  const [tab,   setTab]   = useState('npc')
  const [query, setQuery] = useState('')
  const [pcQuery, setPcQuery] = useState('')
  const [qaName, setQaName] = useState('')
  const [qaType, setQaType] = useState('quick')
  const [qaHp, setQaHp]     = useState('')
  const [qaAc, setQaAc]     = useState('')
  const [deleteConfirm,      setDeleteConfirm]      = useState(null) // { name, type, key }
  const [mobileLibraryMenu,  setMobileLibraryMenu]  = useState(null) // { entry }
  const [libraryPreviewEntry, setLibraryPreviewEntry] = useState(null) // mobile modal
  const [hoverPreviewEntry,   setHoverPreviewEntry]   = useState(null) // { entry, rect } desktop hover
  const [previewSpell,        setPreviewSpell]        = useState(null) // spell name for library preview
  const hoverTimerRef = useRef(null)

  const filteredNPCs = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return monsters
    return monsters.filter((c) => {
      const name   = (c.Name ?? '').toLowerCase()
      const type   = (c.Type ?? '').toLowerCase()
      const source = (c.Source ?? '').toLowerCase()
      return name.includes(q) || type.includes(q) || source.includes(q)
    })
  }, [monsters, query])

  const filteredPCs = useMemo(() => {
    const q = pcQuery.toLowerCase().trim()
    if (!q) return pcs
    return pcs.filter((c) => c.Name.toLowerCase().includes(q))
  }, [pcs, pcQuery])

  const handleLibraryAdd = (entry) => {
    if (entry._libType === 'pc') {
      onAdd({ type: 'pc', name: entry.Name, ac: null, hp: null, statblock: entry })
    } else {
      onAdd({
        type: 'monster',
        name: entry.Name,
        ac: entry.AC?.Value ?? null,
        hp: entry.HP?.Value ? { current: entry.HP.Value, max: entry.HP.Value } : null,
        statblock: entry,
      })
    }
  }

  const handleQuickAdd = (e) => {
    e.preventDefault()
    const name = qaName.trim()
    if (!name && qaType !== 'lair') return
    if (qaType === 'lair') {
      onAdd({ type: 'lair', name: 'Lair Action', ac: null, hp: null, statblock: null })
    } else {
      const parsedHp = parseInt(qaHp, 10)
      const parsedAc = parseInt(qaAc, 10)
      onAdd({
        type: 'quick',
        name,
        ac: isNaN(parsedAc) ? null : parsedAc,
        hp: isNaN(parsedHp) ? null : { current: parsedHp, max: parsedHp },
        statblock: null,
      })
    }
    setQaName('')
    setQaHp('')
    setQaAc('')
  }

  if (collapsed) {
    return (
      <div className="w-10 shrink-0 bg-[#1e1e1e] border-r border-white/[0.06] flex flex-col items-center pt-3">
        <button
          onClick={onToggleCollapse}
          className="text-[#9a9894] hover:text-[#e6e6e6] transition-colors p-1.5 rounded hover:bg-white/[0.06]"
          title="Show library"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M6 3l5 5-5 5" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className={`${isMobile ? 'w-full flex-1' : 'w-64 shrink-0'} bg-[#1e1e1e] border-r border-white/[0.06] flex flex-col`}>
      {/* Tabs + collapse button */}
      <div className="flex border-b border-white/[0.06] shrink-0">
        {[
          { key: 'npc',      label: 'NPC'       },
          { key: 'pc',       label: 'PC'        },
          { key: 'quickadd', label: 'Quick Add'  },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={[
              'flex-1 py-3 text-sm border-b-2 transition-colors',
              tab === key
                ? 'border-gold-400 text-[#e6e6e6]'
                : 'border-transparent text-[#9a9894] hover:text-[#e6e6e6]',
            ].join(' ')}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
        <button
          onClick={onToggleCollapse}
          className="max-lg:hidden px-2 text-[#9a9894] hover:text-[#e6e6e6] transition-colors shrink-0"
          title="Collapse library"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M10 3l-5 5 5 5" />
          </svg>
        </button>
      </div>

      {/* ── NPC Library ────────────────────────────────────────────────── */}
      {tab === 'npc' && (
        <>
          <div className="px-3 py-2 border-b border-white/[0.04] shrink-0 flex items-center gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search NPCs…"
              className="flex-1 bg-transparent text-sm text-[#e6e6e6] placeholder:text-[#787774] focus:outline-none py-1 border-b border-transparent focus:border-white/[0.2] transition-colors"
            />
            <button
              onClick={() => onNewStatblock?.()}
              className="shrink-0 text-xs text-[#9a9894] hover:text-gold-400 border border-white/[0.1] hover:border-gold-400/40 rounded px-1.5 py-0.5 transition-colors"
              title="Add new statblock from JSON"
            >
              + New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredNPCs.length === 0 && (
              <p className="text-[#b8b5b0] text-sm text-center py-6">No results</p>
            )}
            {filteredNPCs.map((entry) => (
              <div
                key={entry._key ?? entry.Id ?? entry.Name}
                className="w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-white/[0.04] transition-colors border-b border-white/[0.03] group cursor-pointer"
                onClick={() => isMobile ? setMobileLibraryMenu({ entry }) : handleLibraryAdd(entry)}
                onMouseEnter={(e) => {
                  if (isMobile || !(entry.HP || entry.AC || entry.Abilities)) return
                  if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
                  setHoverPreviewEntry({ entry, rect: e.currentTarget.getBoundingClientRect() })
                }}
                onMouseLeave={() => {
                  if (isMobile) return
                  hoverTimerRef.current = setTimeout(() => setHoverPreviewEntry(null), 200)
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[#e6e6e6] truncate">{entry.Name}</div>
                  {entry.Type && (
                    <div className="text-xs text-[#9a9894] truncate mt-0.5">{entry.Type}</div>
                  )}
                </div>
                <div className="flex flex-col items-end shrink-0 gap-0.5">
                  {entry.ChallengeRating && (
                    <span className="text-xs text-[#9a9894]">CR {entry.ChallengeRating}</span>
                  )}
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      className="text-[#9a9894] hover:text-gold-400 text-xs"
                      onClick={(e) => { e.stopPropagation(); onEditStatblock?.(entry) }}
                      title="Edit statblock"
                    >
                      ✎
                    </button>
                    <button
                      className="text-[#9a9894] hover:text-red-400 text-xs"
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ name: entry.Name, type: 'npc', key: entry._key }) }}
                      title="Delete statblock"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── PC Library ─────────────────────────────────────────────────── */}
      {tab === 'pc' && (
        <>
          <div className="px-3 py-2 border-b border-white/[0.04] shrink-0">
            <input
              type="text"
              value={pcQuery}
              onChange={(e) => setPcQuery(e.target.value)}
              placeholder="Search PCs…"
              className="w-full bg-transparent text-sm text-[#e6e6e6] placeholder:text-[#787774] focus:outline-none py-1 border-b border-transparent focus:border-white/[0.2] transition-colors"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredPCs.length === 0 && (
              <p className="text-[#b8b5b0] text-sm text-center py-6">No results</p>
            )}
            {filteredPCs.map((entry) => (
              <div
                key={entry._key ?? entry.Id ?? entry.Name}
                className="w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-white/[0.04] transition-colors border-b border-white/[0.03] group cursor-pointer"
                onClick={() => isMobile ? setMobileLibraryMenu({ entry }) : handleLibraryAdd(entry)}
                onMouseEnter={(e) => {
                  if (isMobile || !(entry.HP || entry.AC || entry.Abilities)) return
                  if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
                  setHoverPreviewEntry({ entry, rect: e.currentTarget.getBoundingClientRect() })
                }}
                onMouseLeave={() => {
                  if (isMobile) return
                  hoverTimerRef.current = setTimeout(() => setHoverPreviewEntry(null), 200)
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[#e6e6e6] truncate">{entry.Name}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Quick Add ───────────────────────────────────────────────────── */}
      {tab === 'quickadd' && (
        <div className="flex-1 p-4">
          <form onSubmit={handleQuickAdd} className="space-y-4">
            <div>
              <label className="label-section mb-2 block">Name</label>
              <input
                type="text"
                value={qaName}
                onChange={(e) => setQaName(e.target.value)}
                placeholder="Creature name…"
                className="w-full bg-transparent border-b border-white/[0.12] py-1.5 text-sm text-[#e6e6e6] focus:outline-none focus:border-gold-400 placeholder:text-[#787774] transition-colors"
              />
            </div>
            <div>
              <label className="label-section mb-2 block">Type</label>
              <div className="flex gap-2">
                {[
                  { val: 'quick', label: 'NPC / Summon' },
                  { val: 'lair',  label: 'Lair Action'  },
                ].map(({ val, label }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setQaType(val)}
                    className={[
                      'flex-1 text-sm rounded px-2 py-1.5 border transition-colors',
                      qaType === val
                        ? 'border-gold-400/60 bg-gold-400/10 text-gold-400'
                        : 'border-white/[0.1] text-[#9a9894] hover:text-[#e6e6e6] hover:border-white/[0.2]',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {qaType === 'quick' && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="label-section mb-1.5 block">HP</label>
                  <input
                    type="number"
                    value={qaHp}
                    onChange={(e) => setQaHp(e.target.value)}
                    placeholder="Hit Points"
                    min="1"
                    className="w-full bg-transparent border-b border-white/[0.12] py-1.5 text-sm text-[#e6e6e6] focus:outline-none focus:border-gold-400 placeholder:text-[#787774] transition-colors"
                  />
                </div>
                <div className="flex-1">
                  <label className="label-section mb-1.5 block">AC</label>
                  <input
                    type="number"
                    value={qaAc}
                    onChange={(e) => setQaAc(e.target.value)}
                    placeholder="Armor Class"
                    min="1"
                    className="w-full bg-transparent border-b border-white/[0.12] py-1.5 text-sm text-[#e6e6e6] focus:outline-none focus:border-gold-400 placeholder:text-[#787774] transition-colors"
                  />
                </div>
              </div>
            )}
            <button
              type="submit"
              disabled={!qaName.trim() && qaType !== 'lair'}
              className="w-full text-sm text-[#e6e6e6] hover:bg-white/[0.06] disabled:opacity-30 rounded px-4 py-2 transition-colors border border-white/[0.1]"
            >
              Add to Tracker
            </button>
          </form>
          <p className="mt-6 text-[#b8b5b0] text-xs leading-relaxed border-t border-white/[0.04] pt-4">
            Quick add creates a combatant with no statblock — useful for improvised NPCs and summoned creatures.
          </p>
        </div>
      )}

      {/* ── Delete confirmation modal ───────────────────────────────────── */}
      {deleteConfirm && createPortal(
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="bg-[#252525] border border-white/[0.1] rounded-lg w-full max-w-sm p-5"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-medium text-[#e6e6e6] mb-2">Delete Statblock</h3>
            <p className="text-sm text-[#b8b5b0] mb-4">
              Are you sure you want to delete <span className="text-[#e6e6e6] font-medium">{deleteConfirm.name}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="text-sm text-[#9a9894] hover:text-[#e6e6e6] border border-white/[0.1] hover:border-white/[0.2] rounded px-3 py-1.5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteStatblock?.(deleteConfirm.name, deleteConfirm.type, deleteConfirm.key)
                  setDeleteConfirm(null)
                }}
                className="text-sm bg-red-500/80 hover:bg-red-500 text-white font-medium rounded px-3 py-1.5 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Mobile library entry popup ───────────────────────────────────── */}
      {mobileLibraryMenu && createPortal(
        <div
          className="fixed inset-0 z-[2000] flex items-end justify-center p-4 pb-20"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setMobileLibraryMenu(null)}
        >
          <div
            className="bg-[#252525] border border-white/[0.1] rounded-xl w-full max-w-sm overflow-hidden"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header — centered name/type, ✕ in top-right corner */}
            <div className="relative px-10 py-3 border-b border-white/[0.06] text-center">
              <p className="text-sm font-medium text-[#e6e6e6]">{mobileLibraryMenu.entry.Name}</p>
              {mobileLibraryMenu.entry.Type && (
                <p className="text-xs text-[#9a9894] mt-0.5">{mobileLibraryMenu.entry.Type}</p>
              )}
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9894] hover:text-[#e6e6e6] transition-colors text-sm leading-none"
                onClick={() => setMobileLibraryMenu(null)}
              >
                ✕
              </button>
            </div>

            {/* Action buttons — outlined, centered text, with gaps */}
            <div className="p-3 flex flex-col gap-2">
              <button
                className="w-full text-center px-4 py-3 text-sm text-[#e6e6e6] hover:bg-white/[0.06] border border-white/[0.15] rounded-lg transition-colors"
                onClick={() => { handleLibraryAdd(mobileLibraryMenu.entry); setMobileLibraryMenu(null) }}
              >
                Add combatant to combat
              </button>
              {(mobileLibraryMenu.entry.HP || mobileLibraryMenu.entry.AC || mobileLibraryMenu.entry.Abilities) && (
                <button
                  className="w-full text-center px-4 py-3 text-sm text-[#e6e6e6] hover:bg-white/[0.06] border border-white/[0.15] rounded-lg transition-colors"
                  onClick={() => { setLibraryPreviewEntry(mobileLibraryMenu.entry); setMobileLibraryMenu(null) }}
                >
                  View statblock
                </button>
              )}
              {mobileLibraryMenu.entry._libType !== 'pc' && (
                <>
                  <button
                    className="w-full text-center px-4 py-3 text-sm text-[#e6e6e6] hover:bg-white/[0.06] border border-white/[0.15] rounded-lg transition-colors"
                    onClick={() => { onEditStatblock?.(mobileLibraryMenu.entry); setMobileLibraryMenu(null) }}
                  >
                    Edit statblock
                  </button>
                  <button
                    className="w-full text-center px-4 py-3 text-sm text-red-400 hover:bg-white/[0.06] border border-red-400/[0.25] rounded-lg transition-colors"
                    onClick={() => {
                      setDeleteConfirm({ name: mobileLibraryMenu.entry.Name, type: 'npc', key: mobileLibraryMenu.entry._key })
                      setMobileLibraryMenu(null)
                    }}
                  >
                    Delete statblock
                  </button>
                </>
              )}
            </div>

            {/* Cancel — plain text, no outline */}
            <div className="border-t border-white/[0.06] px-4 py-3">
              <button
                className="w-full text-center text-sm text-[#9a9894] hover:text-[#e6e6e6] transition-colors"
                onClick={() => setMobileLibraryMenu(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Desktop: statblock hover preview (no modal, no backdrop) ───── */}
      {!isMobile && hoverPreviewEntry && createPortal(
        <div
          className="fixed z-[2000] bg-[#1e1e1e] border border-white/[0.1] rounded-lg flex flex-col overflow-hidden"
          style={{
            left: hoverPreviewEntry.rect.right + 8,
            top: Math.max(48, Math.min(hoverPreviewEntry.rect.top - 20, window.innerHeight - 420)),
            width: 320,
            maxHeight: 'calc(100vh - 64px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
          onMouseEnter={() => { if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current) }}
          onMouseLeave={() => { hoverTimerRef.current = setTimeout(() => setHoverPreviewEntry(null), 200) }}
        >
          <div className="shrink-0 px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <p className="text-sm font-medium text-[#e6e6e6] truncate pr-2">{hoverPreviewEntry.entry.Name}</p>
            <button
              onClick={() => setHoverPreviewEntry(null)}
              className="shrink-0 text-[#9a9894] hover:text-[#e6e6e6] text-sm leading-none transition-colors"
            >
              ✕
            </button>
          </div>
          <StatblockBody sb={hoverPreviewEntry.entry} usage={{}} onUsageChange={null} onRoll={null} onSpellClick={setPreviewSpell} compact />
        </div>,
        document.body
      )}

      {/* ── Mobile: statblock preview modal ─────────────────────────────── */}
      {isMobile && libraryPreviewEntry && createPortal(
        <div
          className="fixed inset-0 z-[2000] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setLibraryPreviewEntry(null)}
        >
          <div
            className="bg-[#1e1e1e] border border-white/[0.1] w-full h-full flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <p className="text-sm font-medium text-[#e6e6e6] truncate pr-2">{libraryPreviewEntry.Name}</p>
              <button
                onClick={() => setLibraryPreviewEntry(null)}
                className="shrink-0 text-[#9a9894] hover:text-[#e6e6e6] text-sm leading-none transition-colors"
              >
                ✕
              </button>
            </div>
            <StatblockBody sb={libraryPreviewEntry} usage={{}} onUsageChange={null} onRoll={null} onSpellClick={setPreviewSpell} compact />
          </div>
        </div>,
        document.body
      )}

      {/* ── Spell drawer for library previews ─────────────────────────────── */}
      {previewSpell && (
        <SpellDrawer spellName={previewSpell} onClose={() => setPreviewSpell(null)} onRoll={null} />
      )}
    </div>
  )
}
