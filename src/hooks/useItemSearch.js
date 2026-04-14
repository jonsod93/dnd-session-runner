import { useState, useEffect, useMemo } from 'react'
import { fetchMagicItems } from '../utils/notionUtils'

export default function useItemSearch() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [rarityFilter, setRarityFilter] = useState(null)

  useEffect(() => {
    fetchMagicItems()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filteredItems = useMemo(() => {
    let result = items
    if (query) {
      const q = query.toLowerCase()
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.type.toLowerCase().includes(q) ||
          item.notes.toLowerCase().includes(q)
      )
    }
    if (rarityFilter) {
      result = result.filter((item) => item.rarity === rarityFilter)
    }
    return result
  }, [items, query, rarityFilter])

  return { items, filteredItems, query, setQuery, rarityFilter, setRarityFilter, loading }
}
