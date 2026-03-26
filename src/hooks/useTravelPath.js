import { useState, useCallback, useEffect, useRef } from 'react'

const LS_CACHE_KEY = 'mythranos-travel-path-v1'
const API_SECRET = import.meta.env.VITE_API_SECRET || ''

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

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true

    fetchWaypoints()
      .then((serverWaypoints) => {
        setWaypoints(serverWaypoints)
        saveCache(serverWaypoints)
      })
      .catch((err) => {
        console.warn('[useTravelPath] Failed to sync from server, using cached data:', err.message)
      })
  }, [])

  const update = useCallback((updater) => {
    setWaypoints((prev) => {
      const next = updater(prev)
      saveCache(next)
      persistWaypoints(next).catch((err) => {
        console.warn('[useTravelPath] Failed to persist:', err.message)
      })
      return next
    })
  }, [])

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
