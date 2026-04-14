import useItemSearch from '../../hooks/useItemSearch'

const RARITIES = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact']

const RARITY_COLORS = {
  Common: 'bg-[#4a4a4a] text-[#ccc]',
  Uncommon: 'bg-emerald-900/60 text-emerald-300',
  Rare: 'bg-blue-900/60 text-blue-300',
  'Very Rare': 'bg-purple-900/60 text-purple-300',
  Legendary: 'bg-yellow-900/60 text-yellow-300',
  Artifact: 'bg-red-900/60 text-red-300',
}

function formatGold(value) {
  if (value == null) return '-'
  return value.toLocaleString() + ' gp'
}

export default function ItemSearch() {
  const { filteredItems, query, setQuery, rarityFilter, setRarityFilter, loading } = useItemSearch()

  return (
    <div>
      <h2 className="font-display text-base font-semibold text-[#e6e6e6] mb-4">
        Magic Item Prices
      </h2>

      {/* Search input */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search items..."
        className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/[0.08] text-sm text-[#e6e6e6] placeholder:text-[#787774] focus:outline-none focus:border-white/[0.15] transition-colors mb-3"
      />

      {/* Rarity filter chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button
          onClick={() => setRarityFilter(null)}
          className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
            !rarityFilter
              ? 'bg-white/[0.12] text-[#e6e6e6]'
              : 'bg-white/[0.04] text-[#787774] hover:text-[#e6e6e6]'
          }`}
        >
          All
        </button>
        {RARITIES.map((r) => (
          <button
            key={r}
            onClick={() => setRarityFilter(rarityFilter === r ? null : r)}
            className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
              rarityFilter === r
                ? RARITY_COLORS[r]
                : 'bg-white/[0.04] text-[#787774] hover:text-[#e6e6e6]'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-sm text-[#787774] py-6 text-center">Loading items...</div>
      )}

      {/* Results */}
      {!loading && (
        <>
          {/* Desktop table */}
          <div className="max-lg:hidden">
            {filteredItems.length === 0 ? (
              <div className="text-sm text-[#787774] py-6 text-center">
                {query || rarityFilter ? 'No items match your search.' : 'No items found.'}
              </div>
            ) : (
              <div className="border border-white/[0.06] rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/[0.03] text-[#787774] text-xs uppercase tracking-[0.08em]">
                      <th className="text-left px-3 py-2 font-medium w-[25%]">Name</th>
                      <th className="text-right px-3 py-2 font-medium whitespace-nowrap">Value</th>
                      <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Rarity</th>
                      <th className="text-left px-3 py-2 font-medium">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredItems.map((item, i) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 py-2 text-[#e6e6e6] font-medium">{item.name}</td>
                        <td className="px-3 py-2 text-[#e6e6e6] text-right font-mono text-xs whitespace-nowrap">
                          {formatGold(item.value)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs ${RARITY_COLORS[item.rarity] || ''}`}>
                            {item.rarity}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[#9a9894]">{item.type || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Mobile card list */}
          <div className="lg:hidden flex flex-col gap-2">
            {filteredItems.length === 0 ? (
              <div className="text-sm text-[#787774] py-6 text-center">
                {query || rarityFilter ? 'No items match your search.' : 'No items found.'}
              </div>
            ) : (
              filteredItems.map((item, i) => (
                <div
                  key={i}
                  className="px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm text-[#e6e6e6] font-medium">{item.name}</span>
                    <span className="font-mono text-xs text-[#e6e6e6] shrink-0">
                      {formatGold(item.value)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`inline-block px-2 py-0.5 rounded ${RARITY_COLORS[item.rarity] || ''}`}>
                      {item.rarity}
                    </span>
                    {item.type && <span className="text-[#787774]">{item.type}</span>}
                  </div>
                  {item.notes && (
                    <div className="text-xs text-[#787774] mt-1.5">{item.notes}</div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Result count */}
          {filteredItems.length > 0 && (
            <div className="text-xs text-[#787774] mt-3">
              {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
            </div>
          )}
        </>
      )}
    </div>
  )
}
