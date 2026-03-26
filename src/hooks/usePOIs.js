import { useState, useCallback, useEffect, useRef } from 'react'

const LS_CACHE_KEY = 'mythranos-map-pois-v1'
import { getToken } from './useAuth'

function authHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(LS_CACHE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveCache(pois) {
  try {
    localStorage.setItem(LS_CACHE_KEY, JSON.stringify(pois))
  } catch {
    // localStorage full or unavailable
  }
}

async function fetchPOIs() {
  const res = await fetch('/api/pois')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function persistPOIs(pois) {
  const res = await fetch('/api/pois', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ pois }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export function usePOIs() {
  const [pois, setPois] = useState(loadCache)
  const hasFetched = useRef(false)

  // Sync from server on mount
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true

    fetchPOIs()
      .then((serverPois) => {
        setPois(serverPois)
        saveCache(serverPois)
      })
      .catch((err) => {
        console.warn('[usePOIs] Failed to sync from server, using cached data:', err.message)
      })
  }, [])

  // Helper: update state, cache, and persist
  const update = useCallback((updater) => {
    setPois((prev) => {
      const next = updater(prev)
      saveCache(next)
      persistPOIs(next).catch((err) => {
        console.warn('[usePOIs] Failed to persist:', err.message)
      })
      return next
    })
  }, [])

  const addPOI = useCallback((poi) => {
    update((prev) => [...prev, { ...poi, id: crypto.randomUUID() }])
  }, [update])

  const updatePOI = useCallback((id, updates) => {
    update((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
  }, [update])

  const removePOI = useCallback((id) => {
    update((prev) => prev.filter((p) => p.id !== id))
  }, [update])

  return { pois, addPOI, updatePOI, removePOI }
}
