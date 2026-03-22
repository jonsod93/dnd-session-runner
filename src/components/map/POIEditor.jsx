import { useState, useEffect, useRef } from 'react'
import { PIN_TYPES } from './POIMarker'
import { searchLocations } from '../../utils/notionUtils'

const COLORS = [
  { value: '#facc15', label: 'Gold' },
  { value: '#f87171', label: 'Red' },
  { value: '#60a5fa', label: 'Blue' },
  { value: '#4ade80', label: 'Green' },
  { value: '#a78bfa', label: 'Purple' },
  { value: '#fb923c', label: 'Orange' },
  { value: '#e6e6e6', label: 'White' },
]

export function POIEditor({ poi, position, onSave, onCancel }) {
  const isEdit = !!poi?.id
  const [name, setName] = useState(poi?.name ?? '')
  const [icon, setIcon] = useState(poi?.icon ?? 'generic')
  const [color, setColor] = useState(poi?.color ?? '#facc15')
  const [notionPageId, setNotionPageId] = useState(poi?.notionPageId ?? '')
  const [notionPageTitle, setNotionPageTitle] = useState(poi?.notionPageTitle ?? '')

  // Notion search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const searchTimer = useRef(null)

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setSearching(true)
      searchLocations(searchQuery)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false))
    }, 400)
    return () => clearTimeout(searchTimer.current)
  }, [searchQuery])

  // Escape to close
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onCancel])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({
      ...(poi || {}),
      name: name.trim(),
      position: poi?.position ?? position,
      icon,
      color,
      notionPageId: notionPageId || null,
      notionPageTitle: notionPageTitle || null,
    })
  }

  const linkNotion = (result) => {
    setNotionPageId(result.id)
    setNotionPageTitle(result.title)
    if (!name.trim()) setName(result.title)
    setShowSearch(false)
    setSearchQuery('')
  }

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onCancel}
    >
      <div
        className="bg-[#252525] border border-white/[0.1] rounded-lg w-full max-w-md flex flex-col max-h-[85vh]"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-medium text-[#e6e6e6]">
            {isEdit ? 'Edit Point of Interest' : 'Add Point of Interest'}
          </h2>
          <button
            className="text-[#787774] hover:text-[#e6e6e6] text-base leading-none transition-colors"
            onClick={onCancel}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs text-[#787774] mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="Location name…"
              className="w-full bg-transparent border-b border-white/[0.12] py-1.5 text-sm text-[#e6e6e6] focus:outline-none focus:border-gold-400 placeholder:text-[#787774] transition-colors"
            />
          </div>

          {/* Icon */}
          <div>
            <label className="block text-xs text-[#787774] mb-1.5">Icon</label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(PIN_TYPES).map(([key, { label, svg }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIcon(key)}
                  className={[
                    'text-xs rounded px-2 py-1.5 border transition-colors flex items-center gap-1.5',
                    icon === key
                      ? 'border-gold-400/60 bg-gold-400/10 text-gold-400'
                      : 'border-white/[0.1] text-[#787774] hover:text-[#e6e6e6] hover:border-white/[0.2]',
                  ].join(' ')}
                  title={label}
                >
                  <span className="text-sm">{svg}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs text-[#787774] mb-1.5">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={[
                    'w-6 h-6 rounded-full border-2 transition-all',
                    color === c.value ? 'border-white scale-110' : 'border-transparent hover:border-white/40',
                  ].join(' ')}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Notion link */}
          <div>
            <label className="block text-xs text-[#787774] mb-1.5">Notion Page</label>
            {notionPageId ? (
              <div className="flex items-center gap-2 py-1">
                <span className="text-sm text-[#e6e6e6] truncate flex-1">
                  {notionPageTitle || notionPageId}
                </span>
                <button
                  type="button"
                  onClick={() => { setNotionPageId(''); setNotionPageTitle('') }}
                  className="text-[10px] text-[#787774] hover:text-red-400 transition-colors"
                >
                  Unlink
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowSearch(!showSearch)}
                  className="text-xs text-[#787774] hover:text-gold-400 border border-white/[0.1] hover:border-gold-400/40 rounded px-2.5 py-1.5 transition-colors"
                >
                  Search Notion Locations…
                </button>
                {showSearch && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search locations…"
                      autoFocus
                      className="w-full bg-[#1e1e1e] border border-white/[0.1] rounded px-3 py-1.5 text-sm text-[#e6e6e6] focus:outline-none focus:border-gold-400/40 placeholder:text-[#787774] transition-colors"
                    />
                    <div className="mt-1.5 max-h-40 overflow-y-auto bg-[#1e1e1e] border border-white/[0.08] rounded">
                      {searching && (
                        <p className="text-[11px] text-[#787774] px-3 py-2 italic">Searching…</p>
                      )}
                      {!searching && searchResults.length === 0 && searchQuery.trim() && (
                        <p className="text-[11px] text-[#787774] px-3 py-2">No results</p>
                      )}
                      {searchResults.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-white/[0.04] transition-colors border-b border-white/[0.03] last:border-0"
                          onClick={() => linkNotion(r)}
                        >
                          <div className="text-xs text-[#e6e6e6]">{r.title}</div>
                          {r.types.length > 0 && (
                            <div className="text-[10px] text-[#787774] mt-0.5">{r.types.join(', ')}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Coordinates (read-only) */}
          <div>
            <label className="block text-xs text-[#787774] mb-1">Coordinates</label>
            <span className="text-[11px] text-[#787774] font-mono">
              {(poi?.position ?? position ?? [0, 0]).map((v) => Math.round(v)).join(', ')}
            </span>
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.06] flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="flex-1 bg-gold-400 hover:bg-gold-300 disabled:opacity-30 text-[#1a1a1a] font-semibold text-sm rounded px-4 py-2.5 transition-colors"
          >
            {isEdit ? 'Save Changes' : 'Add POI'}
          </button>
        </div>
      </div>
    </div>
  )
}
