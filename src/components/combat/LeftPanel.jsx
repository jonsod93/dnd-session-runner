import { useState, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useLibrary } from '../../hooks/useLibrary'
import { StatblockBody } from './StatblockPanel'

const GRACE_MS = 350

export function LeftPanel({ onAdd, collapsed, onToggleCollapse }) {
  const [tab,   setTab]   = useState('npc')
  const { monsters, pcs } = useLibrary()
  const [query, setQuery] = useState('')
  const [pcQuery, setPcQuery] = useState('')
  const [qaName, setQaName] = useState('')
  const [qaType, setQaType] = useState('quick')

  // ── Hover preview state ───────────────────────────────────────────────────
  const [preview,       setPreview]       = useState(null) // { entry, anchor }
  const graceTimer                        = useRef(null)

  const clearGrace = useCallback(() => clearTimeout(graceTimer.current), [])

  const startGrace = useCallback(() => {
    graceTimer.current = setTimeout(() => setPreview(null), GRACE_MS)
  }, [])

  const handleEntryMouseEnter = useCallback((entry, e) => {
    if (!entry.HP && !entry.AC && !entry.Abilities) return // skip entries with no statblock data
    clearGrace()
    const rect = e.currentTarget.getBoundingClientRect()
    setPreview({ entry, top: rect.top })
  }, [clearGrace])

  const handleEntryMouseLeave = useCallback(() => {
    startGrace()
  }, [startGrace])

  const handlePreviewMouseEnter = useCallback(() => {
    clearGrace()
  }, [clearGrace])

  const handlePreviewMouseLeave = useCallback(() => {
    startGrace()
  }, [startGrace])

  // ──────────────────────────────────────────────────────────────────────────

  const filteredNPCs = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return monsters
    return monsters.filter((c) => c.Name.toLowerCase().includes(q))
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
      onAdd({ type: 'quick', name, ac: null, hp: null, statblock: null })
    }
    setQaName('')
  }

  if (collapsed) {
    return (
      <div className="w-10 shrink-0 bg-[#1e1e1e] border-r border-white/[0.06] flex flex-col items-center pt-3">
        <button
          onClick={onToggleCollapse}
          className="text-[#787774] hover:text-[#e6e6e6] transition-colors p-1.5 rounded hover:bg-white/[0.06]"
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
    <div className="w-64 shrink-0 bg-[#1e1e1e] border-r border-white/[0.06] flex flex-col">
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
              'flex-1 py-3 text-xs border-b-2 transition-colors',
              tab === key
                ? 'border-gold-400 text-[#e6e6e6]'
                : 'border-transparent text-[#787774] hover:text-[#e6e6e6]',
            ].join(' ')}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
        <button
          onClick={onToggleCollapse}
          className="px-2 text-[#787774] hover:text-[#e6e6e6] transition-colors shrink-0"
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
          <div className="px-3 py-2 border-b border-white/[0.04] shrink-0">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search NPCs…"
              className="w-full bg-transparent text-sm text-[#e6e6e6] placeholder:text-[#787774] focus:outline-none py-1 border-b border-transparent focus:border-white/[0.2] transition-colors"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredNPCs.length === 0 && (
              <p className="text-[#787774] text-sm text-center py-6">No results</p>
            )}
            {filteredNPCs.map((entry) => (
              <button
                key={entry.Id ?? entry.Name}
                className="w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-white/[0.04] transition-colors border-b border-white/[0.03] group"
                onClick={() => handleLibraryAdd(entry)}
                onMouseEnter={(e) => handleEntryMouseEnter(entry, e)}
                onMouseLeave={handleEntryMouseLeave}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[#e6e6e6] truncate">{entry.Name}</div>
                  {entry.Type && (
                    <div className="text-[11px] text-[#787774] truncate mt-0.5">{entry.Type}</div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {entry.ChallengeRating && (
                    <span className="text-[11px] text-[#787774]">CR {entry.ChallengeRating}</span>
                  )}
                  <span className="text-[#787774] group-hover:text-[#e6e6e6] text-sm transition-colors">+</span>
                </div>
              </button>
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
              <p className="text-[#787774] text-sm text-center py-6">No results</p>
            )}
            {filteredPCs.map((entry) => (
              <button
                key={entry.Id ?? entry.Name}
                className="w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-white/[0.04] transition-colors border-b border-white/[0.03] group"
                onClick={() => handleLibraryAdd(entry)}
                onMouseEnter={(e) => handleEntryMouseEnter(entry, e)}
                onMouseLeave={handleEntryMouseLeave}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[#e6e6e6] truncate">{entry.Name}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-blue-400/80 border border-blue-400/30 px-1.5 py-0.5 rounded">
                    PC
                  </span>
                  <span className="text-[#787774] group-hover:text-[#e6e6e6] text-sm transition-colors">+</span>
                </div>
              </button>
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
                      'flex-1 text-xs rounded px-2 py-1.5 border transition-colors',
                      qaType === val
                        ? 'border-gold-400/60 bg-gold-400/10 text-gold-400'
                        : 'border-white/[0.1] text-[#787774] hover:text-[#e6e6e6] hover:border-white/[0.2]',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={!qaName.trim() && qaType !== 'lair'}
              className="w-full text-sm text-[#e6e6e6] hover:bg-white/[0.06] disabled:opacity-30 rounded px-4 py-2 transition-colors border border-white/[0.1]"
            >
              Add to Tracker
            </button>
          </form>
          <p className="mt-6 text-[#787774] text-[11px] leading-relaxed border-t border-white/[0.04] pt-4">
            Quick add creates a combatant with no statblock — useful for improvised NPCs and summoned creatures.
          </p>
        </div>
      )}

      {/* ── Hover preview portal ─────────────────────────────────────────── */}
      {preview && createPortal(
        <LibraryPreview
          entry={preview.entry}
          top={preview.top}
          onMouseEnter={handlePreviewMouseEnter}
          onMouseLeave={handlePreviewMouseLeave}
        />,
        document.body
      )}
    </div>
  )
}

// ── Library statblock preview ─────────────────────────────────────────────────
function LibraryPreview({ entry, top, onMouseEnter, onMouseLeave }) {
  const PANEL_W   = 288
  const PANEL_H   = 480
  const LEFT      = 256 + 8 // left panel width + gap

  // Clamp vertically so preview doesn't go off-screen
  const clampedTop = Math.min(
    Math.max(top, 48 + 8),           // below nav
    window.innerHeight - PANEL_H - 8  // above bottom
  )

  return (
    <div
      className="fixed z-30 bg-[#1e1e1e] border border-white/[0.1] rounded-lg flex flex-col overflow-hidden"
      style={{
        left:   LEFT,
        top:    clampedTop,
        width:  PANEL_W,
        height: PANEL_H,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Preview header */}
      <div className="shrink-0 px-4 py-2.5 border-b border-white/[0.06]">
        <p className="text-sm font-medium text-[#e6e6e6] truncate">{entry.Name}</p>
        {entry.Type && (
          <p className="text-[11px] text-[#787774] italic truncate mt-0.5">{entry.Type}</p>
        )}
      </div>
      {/* Statblock body */}
      <StatblockBody sb={entry} usage={{}} onUsageChange={null} onRoll={null} onSpellClick={null} />
    </div>
  )
}
