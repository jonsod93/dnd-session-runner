import { useState, useCallback, useEffect, useRef } from 'react'

const LS_CACHE_KEY = 'mythranos-travel-path-v1'
const LS_DIRTY_KEY = 'mythranos-travel-path-dirty'
const API_SECRET = import.meta.env.VITE_API_SECRET || ''
const DEBOUNCE_MS = 2000

function authHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  if (API_SECRET) headers['Authorization'] = `Bearer ${API_SECRET}`
  return headers
}

function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(LS_CACHE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveCache(waypoints) {
  try {
    localStorage.setItem(LS_CACHE_KEY, JSON.stringify(waypoints))
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

async function fetchWaypoints() {
  const res = await fetch('/api/travel-path')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function persistWaypoints(waypoints) {
  const res = await fetch('/api/travel-path', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ waypoints }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export function useTravelPath() {
  const [waypoints, setWaypoints] = useState(loadCache)
  const hasFetched = useRef(false)
  const debounceTimer = useRef(null)
  const latestWaypoints = useRef(waypoints)

  // Keep ref in sync for debounced persist
  useEffect(() => {
    latestWaypoints.current = waypoints
  }, [waypoints])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true

    // If we have unsynced local changes, push them to server first
    if (isDirty()) {
      console.log('[useTravelPath] Found unsynced local changes, pushing to server...')
      const localData = loadCache()
      persistWaypoints(localData)
        .then(() => {
          clearDirty()
          console.log('[useTravelPath] Successfully synced local changes to server')
        })
        .catch((err) => {
          console.warn('[useTravelPath] Still unable to sync local changes:', err.message)
        })
      return // Keep local data, don't overwrite with server
    }

    fetchWaypoints()
      .then((serverWaypoints) => {
        setWaypoints(serverWaypoints)
        saveCache(serverWaypoints)
      })
      .catch((err) => {
        console.warn('[useTravelPath] Failed to sync from server, using cached data:', err.message)
      })
  }, [])

  const debouncedPersist = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      const data = latestWaypoints.current
      persistWaypoints(data)
        .then(() => {
          clearDirty()
        })
        .catch((err) => {
          markDirty()
          console.warn('[useTravelPath] Failed to persist:', err.message)
        })
    }, DEBOUNCE_MS)
  }, [])

  const update = useCallback((updater) => {
    setWaypoints((prev) => {
      const next = updater(prev)
      saveCache(next)
      markDirty() // Mark dirty immediately, clear on successful persist
      debouncedPersist()
      return next
    })
  }, [debouncedPersist])

  const addWaypoint = useCallback((waypoint) => {
    update((prev) => [...prev, { ...waypoint, id: crypto.randomUUID() }])
  }, [update])

  const updateWaypoint = useCallback((id, updates) => {
    update((prev) => prev.map((w) => (w.id === id ? { ...w, ...updates } : w)))
  }, [update])

  const removeWaypoint = useCallback((id) => {
    update((prev) => prev.filter((w) => w.id !== id))
  }, [update])

  const reorderWaypoints = useCallback((newOrder) => {
    update(() => newOrder)
  }, [update])

  return { waypoints, addWaypoint, updateWaypoint, removeWaypoint, reorderWaypoints }
}
