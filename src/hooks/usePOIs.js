import { useState, useCallback, useEffect, useRef } from 'react'

const LS_CACHE_KEY = 'mythranos-map-pois-v1'
const LS_DIRTY_KEY = 'mythranos-map-pois-dirty'
const DEBOUNCE_MS = 2000
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

function isDirty() {
  return localStorage.getItem(LS_DIRTY_KEY) === '1'
}

function markDirty() {
  try { localStorage.setItem(LS_DIRTY_KEY, '1') } catch {}
}

function clearDirty() {
  try { localStorage.removeItem(LS_DIRTY_KEY) } catch {}
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
  const debounceTimer = useRef(null)
  const latestPois = useRef(pois)

  // Keep ref in sync for debounced persist
  useEffect(() => {
    latestPois.current = pois
  }, [pois])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  // Sync from server on mount
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true

    // If we have unsynced local changes, push them to server first
    if (isDirty()) {
      console.log('[usePOIs] Found unsynced local changes, pushing to server...')
      const localData = loadCache()
      persistPOIs(localData)
        .then(() => {
          clearDirty()
          console.log('[usePOIs] Successfully synced local changes to server')
        })
        .catch((err) => {
          console.warn('[usePOIs] Still unable to sync local changes:', err.message)
        })
      return // Keep local data, don't overwrite with server
    }

    fetchPOIs()
      .then((serverPois) => {
        setPois(serverPois)
        saveCache(serverPois)
      })
      .catch((err) => {
        console.warn('[usePOIs] Failed to sync from server, using cached data:', err.message)
      })
  }, [])

  const debouncedPersist = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      const data = latestPois.current
      persistPOIs(data)
        .then(() => {
          clearDirty()
        })
        .catch((err) => {
          markDirty()
          console.warn('[usePOIs] Failed to persist:', err.message)
        })
    }, DEBOUNCE_MS)
  }, [])

  // Helper: update state, cache, and persist
  const update = useCallback((updater) => {
    setPois((prev) => {
      const next = updater(prev)
      saveCache(next)
      markDirty()
      debouncedPersist()
      return next
    })
  }, [debouncedPersist])

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
