import { useState, useMemo } from 'react'
import { useLibrary } from '../../hooks/useLibrary'

export function LeftPanel({ onAdd }) {
  const [tab, setTab] = useState('library')
  const { all } = useLibrary()
  const [query, setQuery] = useState('')

  // Quick Add form state
  const [qaName, setQaName] = useState('')
  const [qaType, setQaType] = useState('quick')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return all
    return all.filter((c) => c.Name.toLowerCase().includes(q))
  }, [all, query])

  const handleLibraryAdd = (entry) => {
    if (entry._libType === 'pc') {
      onAdd({
        type: 'pc',
        name: entry.Name,
        ac: null,
        hp: null,
        statblock: entry,
      })
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
    if (!name) return
    if (qaType === 'lair') {
      onAdd({ type: 'lair', name: 'Lair Action', ac: null, hp: null, statblock: null })
    } else {
      onAdd({ type: 'quick', name, ac: null, hp: null, statblock: null })
    }
    setQaName('')
  }

  return (
    <div className="w-64 shrink-0 bg-slate-900 border-r border-slate-700 flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-slate-700 shrink-0">
        {[
          { key: 'library', label: 'Library' },
          { key: 'quickadd', label: 'Quick Add' },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={[
              'flex-1 py-2.5 text-xs font-display uppercase tracking-widest border-b-2 transition-colors',
              tab === key
                ? 'border-gold-400 text-gold-400'
                : 'border-transparent text-slate-500 hover:text-slate-300',
            ].join(' ')}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Library tab */}
      {tab === 'library' && (
        <>
          <div className="px-3 py-2 border-b border-slate-800 shrink-0">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-gold-500 placeholder:text-slate-600"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-slate-600 text-xs text-center py-6">No results</p>
            )}
            {filtered.map((entry) => (
              <button
                key={entry.Id ?? entry.Name}
                className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-800/60 transition-colors border-b border-slate-800/50 group"
                onClick={() => handleLibraryAdd(entry)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-200 group-hover:text-slate-100 truncate">
                    {entry.Name}
                  </div>
                  {entry._libType === 'monster' && entry.Type && (
                    <div className="text-[10px] text-slate-600 truncate">{entry.Type}</div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {entry._libType === 'pc' ? (
                    <span className="text-[10px] bg-blue-900/60 text-blue-300 px-1.5 py-0.5 rounded uppercase">
                      PC
                    </span>
                  ) : (
                    entry.ChallengeRating && (
                      <span className="text-[10px] text-slate-500">CR {entry.ChallengeRating}</span>
                    )
                  )}
                  <span className="text-slate-600 group-hover:text-slate-400 text-xs">+</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Quick Add tab */}
      {tab === 'quickadd' && (
        <div className="flex-1 p-4">
          <form onSubmit={handleQuickAdd} className="space-y-3">
            <div>
              <label className="label-section mb-1 block">Name</label>
              <input
                type="text"
                value={qaName}
                onChange={(e) => setQaName(e.target.value)}
                placeholder="Creature name…"
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-gold-500 placeholder:text-slate-600"
              />
            </div>
            <div>
              <label className="label-section mb-1 block">Type</label>
              <div className="flex gap-2">
                {[
                  { val: 'quick', label: 'NPC / Summon' },
                  { val: 'lair', label: 'Lair Action' },
                ].map(({ val, label }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setQaType(val)}
                    className={[
                      'flex-1 text-xs rounded px-2 py-1.5 border transition-colors',
                      qaType === val
                        ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                        : 'border-slate-600 text-slate-400 hover:border-slate-500',
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
              className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 text-sm rounded px-4 py-2 transition-colors"
            >
              Add to Tracker
            </button>
          </form>

          <div className="mt-6 border-t border-slate-800 pt-4">
            <p className="text-slate-600 text-xs leading-relaxed">
              Quick add creates a combatant with no statblock — useful for improvised NPCs,
              summoned creatures, or anything not in the library.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
