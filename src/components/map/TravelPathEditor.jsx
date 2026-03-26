import { useState } from 'react'

/**
 * Panel for managing travel path waypoints.
 * Supports two waypoint types:
 * - Travel: invisible routing points that shape the line
 * - Event: marked stops with label, custom text, and optional POI link
 */
export function TravelPathEditor({ waypoints, pois, onAdd, onUpdate, onRemove, onReorder, onClose }) {
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const handleDragStart = (e, idx) => {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, idx) => {
    e.preventDefault()
    setDragOverIdx(idx)
  }

  const handleDrop = (e, idx) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null)
      setDragOverIdx(null)
      return
    }
    const reordered = [...waypoints]
    const [moved] = reordered.splice(dragIdx, 1)
    reordered.splice(idx, 0, moved)
    onReorder(reordered)
    setDragIdx(null)
    setDragOverIdx(null)
  }

  const toggleExpanded = (id) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="bg-[#252525] border border-white/[0.1] rounded-lg w-full max-w-lg flex flex-col max-h-[85vh]"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-medium text-[#e6e6e6]">Travel Path Waypoints</h2>
          <button
            className="text-[#9a9894] hover:text-[#e6e6e6] text-base leading-none transition-colors"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Info */}
        <div className="px-5 pt-3 pb-1">
          <p className="text-xs text-[#9a9894]">
            Right-click the map while in edit mode to add waypoints. Drag to reorder. Click a row to expand event details.
          </p>
        </div>

        {/* Waypoint list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {waypoints.length === 0 && (
            <p className="text-sm text-[#787774] italic py-4 text-center">
              No waypoints yet. Right-click the map to add one.
            </p>
          )}

          {waypoints.map((wp, idx) => {
            const isExpanded = expandedId === wp.id
            const isEvent = wp.type === 'event'

            return (
              <div key={wp.id} className="mb-0.5">
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={() => { setDragIdx(null); setDragOverIdx(null) }}
                  className={[
                    'flex items-center gap-2 py-2 px-2 rounded group transition-colors cursor-pointer',
                    dragOverIdx === idx ? 'bg-gold-400/10 border border-gold-400/30' : 'border border-transparent',
                    'hover:bg-white/[0.03]',
                  ].join(' ')}
                  onClick={() => toggleExpanded(wp.id)}
                >
                  {/* Drag handle */}
                  <span className="text-[#787774] cursor-grab text-xs select-none" title="Drag to reorder"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ⠿
                  </span>

                  {/* Index */}
                  <span className="text-xs text-[#787774] font-mono w-5 text-right shrink-0">
                    {idx + 1}.
                  </span>

                  {/* Color dot */}
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        isEvent || idx === 0 || idx === waypoints.length - 1
                          ? '#d4a843' : '#555',
                    }}
                  />

                  {/* Type badge */}
                  <span className={[
                    'text-[10px] px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wider font-medium',
                    isEvent
                      ? 'bg-gold-400/10 text-gold-400 border border-gold-400/20'
                      : 'bg-white/[0.04] text-[#787774] border border-white/[0.06]',
                  ].join(' ')}>
                    {isEvent ? 'Event' : 'Travel'}
                  </span>

                  {/* Label */}
                  <span className="flex-1 text-sm text-[#e6e6e6] truncate min-w-0">
                    {wp.label || (isEvent ? 'Unnamed event' : `Waypoint ${idx + 1}`)}
                  </span>

                  {/* Session */}
                  {wp.session && (
                    <span className="text-[10px] text-[#9a9894] shrink-0">S{wp.session}</span>
                  )}

                  {/* Teleport indicator */}
                  {wp.teleport && (
                    <span className="text-xs text-purple-400 shrink-0" title="Teleport">⚡</span>
                  )}

                  {/* Expand arrow */}
                  <span className={[
                    'text-xs text-[#787774] transition-transform shrink-0',
                    isExpanded ? 'rotate-90' : '',
                  ].join(' ')}>
                    ▸
                  </span>

                  {/* Delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemove(wp.id) }}
                    className="text-xs text-[#787774] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    title="Remove waypoint"
                  >
                    ✕
                  </button>
                </div>

                {/* Expanded editing area */}
                {isExpanded && (
                  <div className="ml-9 mr-2 mb-2 mt-1 p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg space-y-3">
                    {/* Type toggle */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-[#9a9894] w-14 shrink-0">Type</label>
                      <div className="flex gap-1">
                        <button
                          onClick={() => onUpdate(wp.id, { type: 'travel' })}
                          className={[
                            'text-xs px-2.5 py-1 rounded border transition-colors',
                            !isEvent
                              ? 'border-white/[0.15] bg-white/[0.06] text-[#e6e6e6]'
                              : 'border-white/[0.06] text-[#787774] hover:text-[#9a9894]',
                          ].join(' ')}
                        >
                          🚶 Travel
                        </button>
                        <button
                          onClick={() => onUpdate(wp.id, { type: 'event' })}
                          className={[
                            'text-xs px-2.5 py-1 rounded border transition-colors',
                            isEvent
                              ? 'border-gold-400/30 bg-gold-400/10 text-gold-400'
                              : 'border-white/[0.06] text-[#787774] hover:text-[#9a9894]',
                          ].join(' ')}
                        >
                          ⭐ Event
                        </button>
                      </div>
                    </div>

                    {/* Label */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-[#9a9894] w-14 shrink-0">Label</label>
                      <input
                        type="text"
                        value={wp.label || ''}
                        onChange={(e) => onUpdate(wp.id, { label: e.target.value })}
                        placeholder={isEvent ? 'Event name' : 'Optional label'}
                        className="flex-1 bg-[#1a1a1a] text-sm text-[#e6e6e6] placeholder:text-[#787774] px-2.5 py-1.5 rounded border border-white/[0.08] focus:outline-none focus:border-white/[0.2] transition-colors min-w-0"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    {/* Session number */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-[#9a9894] w-14 shrink-0">Session</label>
                      <input
                        type="number"
                        value={wp.session ?? ''}
                        onChange={(e) => onUpdate(wp.id, { session: e.target.value ? Number(e.target.value) : null })}
                        placeholder="#"
                        className="w-16 bg-[#1a1a1a] text-sm text-[#e6e6e6] placeholder:text-[#787774] px-2.5 py-1.5 rounded border border-white/[0.08] focus:outline-none focus:border-white/[0.2] transition-colors text-center"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    {/* Teleport toggle */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-[#9a9894] w-14 shrink-0">Teleport</label>
                      <button
                        onClick={() => onUpdate(wp.id, { teleport: !wp.teleport })}
                        className={[
                          'text-xs px-2.5 py-1 rounded border transition-colors',
                          wp.teleport
                            ? 'border-purple-400/50 bg-purple-400/10 text-purple-400'
                            : 'border-white/[0.08] text-[#787774] hover:text-[#9a9894] hover:border-white/[0.15]',
                        ].join(' ')}
                      >
                        {wp.teleport ? '⚡ Teleported here' : 'No'}
                      </button>
                    </div>

                    {/* Event-only fields */}
                    {isEvent && (
                      <>
                        {/* Custom text */}
                        <div className="flex items-start gap-2">
                          <label className="text-xs text-[#9a9894] w-14 shrink-0 pt-1.5">Text</label>
                          <textarea
                            value={wp.customText || ''}
                            onChange={(e) => onUpdate(wp.id, { customText: e.target.value })}
                            placeholder="What happened here..."
                            rows={2}
                            className="flex-1 bg-[#1a1a1a] text-sm text-[#e6e6e6] placeholder:text-[#787774] px-2.5 py-1.5 rounded border border-white/[0.08] focus:outline-none focus:border-white/[0.2] transition-colors min-w-0 resize-none"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>

                        {/* Linked POI */}
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-[#9a9894] w-14 shrink-0">POI</label>
                          <select
                            value={wp.linkedPoiId || ''}
                            onChange={(e) => onUpdate(wp.id, { linkedPoiId: e.target.value || null })}
                            className="flex-1 bg-[#1a1a1a] text-sm text-[#e6e6e6] px-2.5 py-1.5 rounded border border-white/[0.08] focus:outline-none focus:border-white/[0.2] transition-colors min-w-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="">None</option>
                            {pois?.map((poi) => (
                              <option key={poi.id} value={poi.id}>
                                {poi.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {/* Coordinates (read-only) */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-[#787774] w-14 shrink-0">Pos</label>
                      <span className="text-[10px] text-[#787774] font-mono">
                        [{wp.position[0].toFixed(0)}, {wp.position[1].toFixed(0)}]
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-[#787774]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#d4a843] inline-block" /> Event / Start / End
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#555] inline-block" /> Travel
            </span>
          </div>
          <span className="text-xs text-[#787774]">{waypoints.length} waypoint{waypoints.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  )
}
