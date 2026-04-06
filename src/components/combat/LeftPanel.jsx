import { useState, useMemo, useRef, useCallback, useEffect, useLayoutEffect, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { StatblockBody } from './StatblockPanel'
import { SpellDrawer } from '../SpellDrawer'
import { useIsMobile } from '../../hooks/useIsMobile'

const LEFT_MIN_WIDTH = 200
const LEFT_MAX_WIDTH = 400
const LEFT_DEFAULT_WIDTH = 256
const NPC_RENDER_LIMIT = 50

export function LeftPanel({ onAdd, collapsed, onToggleCollapse, onEditStatblock, onNewStatblock, onDeleteStatblock, onSavePC, onDeletePC, monsters, pcs }) {
  const isMobile = useIsMobile()
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = localStorage.getItem('left-panel-width')
    return saved ? Math.max(LEFT_MIN_WIDTH, Math.min(LEFT_MAX_WIDTH, parseInt(saved))) : LEFT_DEFAULT_WIDTH
  })
  const draggingRef = useRef(false)
  const dragStartX = useRef(0)
  const dragStartW = useRef(0)

  const onResizeMouseDown = useCallback((e) => {
    e.preventDefault()
    draggingRef.current = true
    dragStartX.current = e.clientX
    dragStartW.current = panelWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [panelWidth])

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!draggingRef.current) return
      const delta = e.clientX - dragStartX.current
      const newW = Math.max(LEFT_MIN_WIDTH, Math.min(LEFT_MAX_WIDTH, dragStartW.current + delta))
      setPanelWidth(newW)
    }
    const onMouseUp = () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setPanelWidth((w) => { localStorage.setItem('left-panel-width', String(w)); return w })
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])
  const [tab,   setTab]   = useState('npc')
  const [query, setQuery] = useState('')
  const [pcQuery, setPcQuery] = useState('')
  const [qaName, setQaName] = useState('')
  const [qaType, setQaType] = useState('quick')
  const [qaHp, setQaHp]     = useState('')
  const [qaAc, setQaAc]     = useState('')
  const [pcEditName,         setPcEditName]         = useState(null) // { original: string|null, value: string, ac: string }
  const [deleteConfirm,      setDeleteConfirm]      = useState(null) // { name, type, key }
  const [mobileLibraryMenu,  setMobileLibraryMenu]  = useState(null) // { entry }
  const [libraryPreviewEntry, setLibraryPreviewEntry] = useState(null) // mobile modal
  const [hoverPreviewEntry,   setHoverPreviewEntry]   = useState(null) // { entry, rect } desktop hover
  const [previewSpell,        setPreviewSpell]        = useState(null) // spell name for library preview
  const [hoverPreviewStyle,   setHoverPreviewStyle]   = useState(null) // { top, maxHeight } resolved
  const hoverTimerRef = useRef(null)
  const hoverPreviewRef = useRef(null)

  // Measure the preview after mount and clamp it to the viewport. Runs synchronously
  // before paint so the user never sees the un-positioned (visibility:hidden) frame.
  useLayoutEffect(() => {
    if (!hoverPreviewEntry) {
      setHoverPreviewStyle(null)
      return
    }
    const el = hoverPreviewRef.current
    if (!el) return
    const TOP_MARGIN = 16
    const BOTTOM_MARGIN = 16
    const vh = window.innerHeight
    const availableHeight = Math.max(0, vh - TOP_MARGIN - BOTTOM_MARGIN)
    // Temporarily lift the maxHeight cap so the inner flex child expands to its
    // natural height; otherwise scrollHeight would just reflect the prior cap.
    const prevMaxHeight = el.style.maxHeight
    el.style.maxHeight = 'none'
    const naturalHeight = el.scrollHeight
    el.style.maxHeight = prevMaxHeight
    const effectiveHeight = Math.min(naturalHeight, availableHeight)
    const rect = hoverPreviewEntry.rect
    let top = rect.top - 20
    if (top + effectiveHeight > vh - BOTTOM_MARGIN) {
      top = vh - BOTTOM_MARGIN - effectiveHeight
    }
    if (top < TOP_MARGIN) top = TOP_MARGIN
    setHoverPreviewStyle({ top, maxHeight: effectiveHeight })
  }, [hoverPreviewEntry])

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

  const hasNpcQuery = query.trim().length > 0
  const visibleNPCs = hasNpcQuery ? filteredNPCs : filteredNPCs.slice(0, NPC_RENDER_LIMIT)
  const npcsTruncated = !hasNpcQuery && filteredNPCs.length > NPC_RENDER_LIMIT

  const filteredPCs = useMemo(() => {
    const q = pcQuery.toLowerCase().trim()
    if (!q) return pcs
    return pcs.filter((c) => c.Name.toLowerCase().includes(q))
  }, [pcs, pcQuery])

  const handleLibraryAdd = (entry) => {
    if (entry._libType === 'pc') {
      onAdd({ type: 'pc', name: entry.Name, ac: entry.AC ?? null, hp: null, statblock: entry })
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
      <div className="w-10 shrink-0 neu-panel-left flex flex-col items-center pt-3">
        <button
          onClick={onToggleCollapse}
          className="text-[#9a9894] hover:text-[#e6e6e6] transition-colors p-1.5 rounded hover:bg-[#202226]"
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
    <div className={`${isMobile ? 'w-full flex-1' : 'shrink-0'} neu-panel-left flex flex-col relative`} style={isMobile ? undefined : { width: panelWidth }}>
      {/* Resize handle */}
      {!isMobile && (
        <div
          onMouseDown={onResizeMouseDown}
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10 hover:bg-[#e87830]/30 active:bg-[#e87830]/50 transition-colors"
        />
      )}
      {/* Tabs + collapse button */}
      <div className="flex border-b border-white/[0.04] shrink-0">
        {[
          { key: 'npc',      label: 'NPC'       },
          { key: 'pc',       label: 'PC'        },
          { key: 'quickadd', label: 'Other'  },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={[
              'flex-1 py-3 text-sm border-b-2 transition-all',
              tab === key
                ? 'border-[#FF7A45] tab-gradient-b text-[#e6e6e6] nav-active-glow'
                : 'border-transparent text-[#8a8884] hover:text-[#e6e6e6]',
            ].join(' ')}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
        <button
          onClick={onToggleCollapse}
          className="max-lg:hidden px-2 text-[#8a8884] hover:text-[#e6e6e6] transition-colors shrink-0"
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
          <div className="px-2.5 py-2 border-b border-white/[0.04] shrink-0 flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search NPCs…"
                className="input-field w-full !pr-8"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#787774] hover:text-[#e6e6e6] text-xs leading-none transition-colors">✕</button>
              )}
            </div>
            <button
              onClick={() => onNewStatblock?.()}
              className="shrink-0 btn-action !px-2.5 hover:!bg-transparent"
              title="Add new statblock from JSON"
            >
              + New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col">
            {visibleNPCs.length === 0 && (
              <p className="text-[#8a8884] text-sm text-center py-6">No results</p>
            )}
            {visibleNPCs.map((entry, idx) => (
              <Fragment key={entry._key ?? entry.Id ?? entry.Name}>
              {idx > 0 && <div className="row-divider" />}
              <div
                className="w-full text-left px-3 py-2 flex items-center gap-2 library-card group cursor-pointer"
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
                    <div className="text-xs text-[#8a8884] truncate mt-0.5">{entry.Type}</div>
                  )}
                </div>
                <div className="flex flex-col items-end shrink-0 gap-0.5">
                  {entry.ChallengeRating && (
                    <span className="text-xs text-[#8a8884]">CR {entry.ChallengeRating}</span>
                  )}
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      className="text-[#8a8884] hover:text-gold-400 text-xs"
                      onClick={(e) => { e.stopPropagation(); onEditStatblock?.(entry) }}
                      title="Edit statblock"
                    >
                      ✎
                    </button>
                    <button
                      className="text-[#8a8884] hover:text-red-400 text-xs"
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ name: entry.Name, type: 'npc', key: entry._key }) }}
                      title="Delete statblock"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
              </Fragment>
            ))}
          </div>
          {npcsTruncated && (
            <p className="text-[#8a8884] text-xs text-center py-2 border-t border-white/[0.04] shrink-0">
              Showing {NPC_RENDER_LIMIT} of {monsters.length} creatures - type to search
            </p>
          )}
        </>
      )}

      {/* ── PC Library ─────────────────────────────────────────────────── */}
      {tab === 'pc' && (
        <>
          <div className="px-2.5 py-2 border-b border-white/[0.04] shrink-0 flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={pcQuery}
                onChange={(e) => setPcQuery(e.target.value)}
                placeholder="Search PCs…"
                className="input-field w-full !pr-8"
              />
              {pcQuery && (
                <button type="button" onClick={() => setPcQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#787774] hover:text-[#e6e6e6] text-xs leading-none transition-colors">✕</button>
              )}
            </div>
            <button
              onClick={() => setPcEditName({ original: null, value: '', ac: '' })}
              className="shrink-0 btn-action !px-2.5 hover:!bg-transparent"
              title="Add new PC"
            >
              + New
            </button>
          </div>
          {pcEditName && (
            <div className="px-2.5 py-2 border-b border-white/[0.04] shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const name = pcEditName.value.trim()
                  if (!name) return
                  onSavePC?.(name, pcEditName.original, pcEditName.ac)
                  setPcEditName(null)
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={pcEditName.value}
                  onChange={(e) => setPcEditName((prev) => ({ ...prev, value: e.target.value }))}
                  placeholder="PC name…"
                  className="input-field flex-1"
                  autoFocus
                />
                <input
                  type="number"
                  value={pcEditName.ac}
                  onChange={(e) => setPcEditName((prev) => ({ ...prev, ac: e.target.value }))}
                  placeholder="AC"
                  min="1"
                  className="input-field w-14 text-center"
                />
                <button type="submit" className="btn-action !px-2.5">Save</button>
                <button type="button" onClick={() => setPcEditName(null)} className="btn-action !px-2.5">✕</button>
              </form>
            </div>
          )}
          <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col">
            {filteredPCs.length === 0 && (
              <p className="text-[#8a8884] text-sm text-center py-6">No results</p>
            )}
            {filteredPCs.map((entry, idx) => (
              <Fragment key={entry._key ?? entry.Id ?? entry.Name}>
              {idx > 0 && <div className="row-divider" />}
              <div
                className="w-full text-left px-3 py-2 flex items-center gap-2 library-card group cursor-pointer"
                onClick={() => isMobile ? setMobileLibraryMenu({ entry }) : handleLibraryAdd(entry)}
              >
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <div className="text-sm text-[#e6e6e6] truncate">{entry.Name}</div>
                  {entry.AC != null && (
                    <span className="text-[10px] text-[#8a8884] font-mono shrink-0">AC {entry.AC}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                  <button
                    className="text-[#8a8884] hover:text-[#e87830] text-xs"
                    onClick={(e) => { e.stopPropagation(); setPcEditName({ original: entry.Name, value: entry.Name, ac: entry.AC != null ? String(entry.AC) : '' }) }}
                    title="Edit PC"
                  >
                    ✎
                  </button>
                  <button
                    className="text-[#8a8884] hover:text-red-400 text-xs"
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ name: entry.Name, type: 'pc' }) }}
                    title="Delete PC"
                  >
                    ✕
                  </button>
                </div>
              </div>
              </Fragment>
            ))}
          </div>
        </>
      )}

      {/* ── Quick Add ───────────────────────────────────────────────────── */}
      {tab === 'quickadd' && (
        <div className="flex-1 p-3">
          <form onSubmit={handleQuickAdd} className="space-y-4">
            {/* Toggle: NPC/Summon vs Lair Action */}
            <div
              className="relative flex rounded-xl p-[3px] cursor-pointer select-none"
              style={{ background: '#1e1e1e', boxShadow: 'var(--neum-inset)' }}
            >
              {/* Sliding active indicator */}
              <div
                className="absolute top-[3px] bottom-[3px] rounded-[9px] transition-all duration-200 ease-out"
                style={{
                  width: 'calc(50% - 3px)',
                  left: qaType === 'quick' ? '3px' : 'calc(50%)',
                  background: 'linear-gradient(145deg, var(--accent), var(--accent-deep))',
                  boxShadow: '2px 2px 5px var(--shadow-dark), -1px -1px 4px var(--shadow-light), 0 0 12px var(--accent-glow-soft)',
                }}
              />
              {[
                { val: 'quick', label: 'Custom' },
                { val: 'lair',  label: 'Lair Action'  },
              ].map(({ val, label }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setQaType(val)}
                  className="relative z-10 flex-1 text-sm py-2 rounded-[9px] transition-colors duration-200 text-center"
                  style={{
                    color: qaType === val ? '#ffffff' : 'var(--text-muted)',
                    fontWeight: qaType === val ? 600 : 400,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {qaType === 'quick' && (
              <>
                <div>
                  <label className="label-section mb-2 block">Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={qaName}
                      onChange={(e) => setQaName(e.target.value)}
                      placeholder="Creature name…"
                      className="input-field w-full !pr-8"
                    />
                    {qaName && (
                      <button type="button" onClick={() => setQaName('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#787774] hover:text-[#e6e6e6] text-xs leading-none transition-colors">✕</button>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="label-section mb-1.5 block">HP</label>
                    <input
                      type="number"
                      value={qaHp}
                      onChange={(e) => setQaHp(e.target.value)}
                      placeholder="Hit Points"
                      min="1"
                      className="input-field"
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
                      className="input-field"
                    />
                  </div>
                </div>
              </>
            )}
            <button
              type="submit"
              disabled={!qaName.trim() && qaType !== 'lair'}
              className="neu-btn-raised w-full text-sm py-2 rounded-xl transition-all"
            >
              Add to Tracker
            </button>
          </form>
          {qaType === 'quick' && (
            <p className="mt-6 text-[#6a6864] text-xs leading-relaxed border-t border-white/[0.04] pt-4">
              Quick add creates a combatant with no statblock - useful for improvised NPCs and summoned creatures.
            </p>
          )}
        </div>
      )}

      {/* ── Delete confirmation modal ───────────────────────────────────── */}
      {deleteConfirm && createPortal(
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center p-4 neumorphic"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="glass-toast rounded-2xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-medium text-[#e6e6e6] mb-2">Delete {deleteConfirm.type === 'pc' ? 'PC' : 'Statblock'}</h3>
            <p className="text-sm text-[#8a8884] mb-4">
              Are you sure you want to delete <span className="text-[#e6e6e6] font-medium">{deleteConfirm.name}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn-outline !py-1.5 !px-3"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm.type === 'pc') {
                    onDeletePC?.(deleteConfirm.name)
                  } else {
                    onDeleteStatblock?.(deleteConfirm.name, deleteConfirm.type, deleteConfirm.key)
                  }
                  setDeleteConfirm(null)
                }}
                className="text-sm bg-red-400/80 hover:bg-red-400 text-white font-medium rounded-xl px-3 py-1.5 transition-all hover:shadow-neon-red"
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
          className="fixed inset-0 z-[2000] flex items-end justify-center p-4 pb-20 neumorphic"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setMobileLibraryMenu(null)}
        >
          <div
            className="glass-toast rounded-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header — centered name/type, ✕ in top-right corner */}
            <div className="relative px-10 py-3 border-b border-white/[0.04] text-center">
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
                className="w-full text-center px-4 py-3 text-sm text-[#e6e6e6] hover:bg-[#202226] rounded-lg transition-colors shadow-neu-flat"
                onClick={() => { handleLibraryAdd(mobileLibraryMenu.entry); setMobileLibraryMenu(null) }}
              >
                Add combatant to combat
              </button>
              {(mobileLibraryMenu.entry.HP || mobileLibraryMenu.entry.AC || mobileLibraryMenu.entry.Abilities) && (
                <button
                  className="w-full text-center px-4 py-3 text-sm text-[#e6e6e6] hover:bg-[#202226] rounded-lg transition-colors shadow-neu-flat"
                  onClick={() => { setLibraryPreviewEntry(mobileLibraryMenu.entry); setMobileLibraryMenu(null) }}
                >
                  View statblock
                </button>
              )}
              {mobileLibraryMenu.entry._libType !== 'pc' && (
                <>
                  <button
                    className="w-full text-center px-4 py-3 text-sm text-[#e6e6e6] hover:bg-[#202226] rounded-lg transition-colors shadow-neu-flat"
                    onClick={() => { onEditStatblock?.(mobileLibraryMenu.entry); setMobileLibraryMenu(null) }}
                  >
                    Edit statblock
                  </button>
                  <button
                    className="w-full text-center px-4 py-3 text-sm text-red-400 hover:bg-[#202226] rounded-lg transition-colors shadow-neu-flat"
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
            <div className="border-t border-white/[0.04] px-4 py-3">
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
          ref={hoverPreviewRef}
          className="fixed z-[2000] glass-toast rounded-2xl flex flex-col overflow-hidden neumorphic"
          style={{
            left: hoverPreviewEntry.rect.right + 8,
            top: hoverPreviewStyle ? hoverPreviewStyle.top : hoverPreviewEntry.rect.top - 20,
            width: 320,
            maxHeight: hoverPreviewStyle ? hoverPreviewStyle.maxHeight : `calc(100vh - ${16 + 16}px)`,
            visibility: hoverPreviewStyle ? 'visible' : 'hidden',
            '--sb-bg': 'transparent',
            background: 'linear-gradient(180deg, var(--bg-top, #272727) 0%, var(--bg-bottom, #1e1e1e) 100%)',
          }}
          onMouseEnter={() => { if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current) }}
          onMouseLeave={() => { hoverTimerRef.current = setTimeout(() => setHoverPreviewEntry(null), 200) }}
        >
          <div className="shrink-0 px-4 py-3 border-b border-white/[0.04] flex items-center justify-between">
            <p className="text-sm font-semibold text-[#e6e6e6] truncate pr-2">{hoverPreviewEntry.entry.Name}</p>
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
          className="fixed inset-0 z-[2000] flex items-end justify-center neumorphic"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setLibraryPreviewEntry(null)}
        >
          <div
            className="w-full h-full flex flex-col overflow-hidden"
            style={{ '--sb-bg': 'transparent', background: 'linear-gradient(180deg, var(--bg-top, #272727) 0%, var(--bg-bottom, #1e1e1e) 100%)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 px-4 py-3 border-b border-white/[0.04] flex items-center justify-between">
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
