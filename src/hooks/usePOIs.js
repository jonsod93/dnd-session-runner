import { useState, useCallback } from 'react'

const STORAGE_KEY = 'mythranos-map-pois-v1'

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function save(pois) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pois))
}

export function usePOIs() {
  const [pois, setPois] = useState(load)

  const addPOI = useCallback((poi) => {
    setPois((prev) => {
      const next = [...prev, { ...poi, id: crypto.randomUUID() }]
      save(next)
      return next
    })
  }, [])

  const updatePOI = useCallback((id, updates) => {
    setPois((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      save(next)
      return next
    })
  }, [])

  const removePOI = useCallback((id) => {
    setPois((prev) => {
      const next = prev.filter((p) => p.id !== id)
      save(next)
      return next
    })
  }, [])

  return { pois, addPOI, updatePOI, removePOI }
}
