import { useState } from 'react'

function sessionLabel(s) {
  const num = s.sessionNumber != null ? `Session ${s.sessionNumber}` : 'Session'
  return s.title ? `${num} - ${s.title}` : num
}

export default function SessionLinker({
  linkedSession,
  onLink,
  onUnlink,
  searchQuery,
  setSearchQuery,
  searchResults,
  searching,
  compact = false,
}) {
  const [showSearch, setShowSearch] = useState(false)

  if (linkedSession) {
    return (
      <div className={`flex items-center gap-2 ${compact ? '' : 'py-1'}`}>
        <span className={`${compact ? 'text-xs' : 'text-sm'} text-[#e6e6e6] truncate flex-1`}>
          {compact ? sessionLabel(linkedSession) : `Linked: ${sessionLabel(linkedSession)}`}
        </span>
        <button
          type="button"
          onClick={onUnlink}
          className="text-[10px] text-[#787774] hover:text-red-400 transition-colors shrink-0"
        >
          Unlink
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setShowSearch(!showSearch)}
        className={[
          'text-[#787774] hover:text-gold-400 border border-white/[0.1] hover:border-gold-400/40 rounded transition-colors',
          compact ? 'text-xs px-2 py-1' : 'text-xs px-2.5 py-1.5',
        ].join(' ')}
      >
        Link Session...
      </button>

      {showSearch && (
        <div className="mt-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sessions..."
            autoFocus
            className="w-full bg-[#1e1e1e] border border-white/[0.1] rounded px-3 py-1.5 text-sm text-[#e6e6e6] focus:outline-none focus:border-gold-400/40 placeholder:text-[#787774] transition-colors"
          />
          <div className="mt-1.5 max-h-40 overflow-y-auto bg-[#1e1e1e] border border-white/[0.08] rounded">
            {searching && (
              <p className="text-[11px] text-[#787774] px-3 py-2 italic">Searching...</p>
            )}
            {!searching && searchResults.length === 0 && searchQuery.trim() && (
              <p className="text-[11px] text-[#787774] px-3 py-2">No results</p>
            )}
            {searchResults.map((s) => (
              <button
                key={s.id}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-white/[0.04] transition-colors border-b border-white/[0.03] last:border-0"
                onClick={() => { onLink(s); setShowSearch(false) }}
              >
                <div className="text-xs text-[#e6e6e6]">{sessionLabel(s)}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
