import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import rawData from '../data/improved-initiative.json'

function safeParse(val) {
  if (!val) return []
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : val
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function creatureKey(name) {
  return `Creatures.${name}`
}

// ── Persistence helpers ─────────────────────────────────────────────────────
const IS_DEV = import.meta.env.DEV
const LS_CACHE_KEY = 'mythranos:creature-cache'
const LS_DIRTY_KEY = 'mythranos:creature-dirty'
const LS_EDITS_KEY = 'mythranos:creature-edits'
const LS_DELETES_KEY = 'mythranos:creature-deletes'

// Auth token for write operations (JWT from login)
import { getToken } from './useAuth'

function authHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

// ── Dev mode: Vite plugin endpoints ─────────────────────────────────────────

async function devSaveCreature(statblock, oldKey) {
  const res = await fetch('/api/library/creature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ statblock, key: oldKey || undefined }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to save creature')
  return data
}

async function devDeleteCreature(name, key) {
  const res = await fetch('/api/library/creature', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, key }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to delete creature')
  return data
}

// ── Production mode: Vercel serverless API endpoints ────────────────────────

async function prodSaveCreature(statblock, oldKey) {
  const res = await fetch('/api/creatures', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ statblock, key: oldKey || undefined }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to save creature')
  return data
}

async function prodDeleteCreature(name, key) {
  const res = await fetch('/api/creatures', {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ name, key }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to delete creature')
  return data
}

// ── localStorage cache (production only) ────────────────────────────────────

function loadCachedCreatures() {
  try {
    const raw = localStorage.getItem(LS_CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveCachedCreatures(data) {
  try {
    localStorage.setItem(LS_CACHE_KEY, JSON.stringify(data))
  } catch {
    // localStorage full or unavailable - ignore
  }
}

function isCreaturesDirty() {
  return localStorage.getItem(LS_DIRTY_KEY) === '1'
}

function markCreaturesDirty() {
  try { localStorage.setItem(LS_DIRTY_KEY, '1') } catch {}
}

function clearCreaturesDirty() {
  try { localStorage.removeItem(LS_DIRTY_KEY) } catch {}
}

// ── One-time migration: replay old localStorage edits into the API ──────────

async function migrateLocalEdits() {
  const editsRaw = localStorage.getItem(LS_EDITS_KEY)
  const deletesRaw = localStorage.getItem(LS_DELETES_KEY)
  const edits = editsRaw ? JSON.parse(editsRaw) : {}
  const deletes = deletesRaw ? JSON.parse(deletesRaw) : []

  const hasEdits = Object.keys(edits).length > 0
  const hasDeletes = deletes.length > 0
  if (!hasEdits && !hasDeletes) return

  console.log('[useLibrary] Migrating localStorage edits to server...')

  // Replay edits
  for (const [, statblock] of Object.entries(edits)) {
    try {
      await prodSaveCreature(statblock, null)
    } catch (err) {
      console.warn('[useLibrary] Migration: failed to save', statblock.Name, err)
    }
  }

  // Replay deletes
  for (const key of deletes) {
    const name = key.replace(/^Creatures\./, '')
    try {
      await prodDeleteCreature(name)
    } catch (err) {
      console.warn('[useLibrary] Migration: failed to delete', name, err)
    }
  }

  // Clear old keys
  localStorage.removeItem(LS_EDITS_KEY)
  localStorage.removeItem(LS_DELETES_KEY)
  console.log('[useLibrary] Migration complete')
}

// ── Build a monster Map from raw server/bundled data ────────────────────────

function buildMonsterMap(sourceData) {
  const map = new Map()
  const seenNames = new Map() // Name -> key, for deduplication
  Object.entries(sourceData)
    .filter(([k]) => k.startsWith('Creatures.'))
    .forEach(([k, v]) => {
      const name = v.Name ?? k
      const existingKey = seenNames.get(name)
      if (existingKey) {
        // Duplicate Name - prefer name-based keys (what saveCreature produces)
        // over ID-based keys (legacy format)
        const nameBasedKey = `Creatures.${name}`
        if (k === nameBasedKey) {
          map.delete(existingKey)
        } else if (existingKey === nameBasedKey) {
          return // keep the existing name-based key
        }
        // If neither is name-based, keep the first one seen
        else return
      }
      seenNames.set(name, k)
      map.set(k, {
        ...v,
        _libType: 'monster',
        _key: k,
        ChallengeRating: v.ChallengeRating || v.CR || v.Challenge || null,
      })
    })
  return map
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useLibrary() {
  // Seed from localStorage cache (instant) or bundled JSON (fallback)
  const [monsterMap, setMonsterMap] = useState(() => {
    if (!IS_DEV) {
      const cached = loadCachedCreatures()
      if (cached) return buildMonsterMap(cached)
    }
    return buildMonsterMap(rawData)
  })

  const [isLoading, setIsLoading] = useState(!IS_DEV)
  const hasFetched = useRef(false)

  // In production, fetch fresh data from the server on mount
  useEffect(() => {
    if (IS_DEV || hasFetched.current) return
    hasFetched.current = true

    async function sync() {
      try {
        // Migrate any old localStorage edits first
        await migrateLocalEdits()

        // If we have unsynced local changes, don't overwrite with server data
        if (isCreaturesDirty()) {
          console.log('[useLibrary] Found unsynced local changes, keeping local data')
          return
        }

        const res = await fetch('/api/creatures')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()

        setMonsterMap(buildMonsterMap(data))
        saveCachedCreatures(data)
      } catch (err) {
        console.warn('[useLibrary] Failed to sync from server, using cached data:', err.message)
      } finally {
        setIsLoading(false)
      }
    }

    sync()
  }, [])

  const monsters = useMemo(
    () => [...monsterMap.values()].sort((a, b) => a.Name.localeCompare(b.Name)),
    [monsterMap]
  )

  // PCs (read-only from static import)
  const pcs = useMemo(() => {
    const topLevelPCs = Object.entries(rawData)
      .filter(([k]) => k.startsWith('PersistentCharacters.'))
      .map(([, v]) => v)
    const legacyPCs = [
      ...safeParse(rawData['ImprovedInitiative.PersistentCharacters']),
      ...safeParse(rawData['ImprovedInitiative.PlayerCharacters']),
    ]
    const seen = new Set()
    return [...topLevelPCs, ...legacyPCs]
      .filter((pc) => {
        if (!pc.Name || seen.has(pc.Name)) return false
        seen.add(pc.Name)
        return true
      })
      .map((pc) => ({ ...pc, _libType: 'pc' }))
      .sort((a, b) => a.Name.localeCompare(b.Name))
  }, [])

  // ── Add or update a creature ──────────────────────────────────────────────

  const saveCreature = useCallback(async (statblock, originalKey) => {
    // originalKey is the actual map key (e.g. "Creatures.00dpnnui"), not name-derived
    const newKey = creatureKey(statblock.Name)

    // Optimistic local update
    setMonsterMap((prev) => {
      const next = new Map(prev)
      // Remove old key (always - handles both renames and id-based keys)
      if (originalKey && originalKey !== newKey) {
        next.delete(originalKey)
      }
      next.set(newKey, {
        ...statblock,
        _libType: 'monster',
        _key: newKey,
        ChallengeRating: statblock.ChallengeRating || statblock.CR || statblock.Challenge || null,
      })
      return next
    })

    // Strip internal fields before persisting
    const { _libType, _key, _custom, ...clean } = statblock

    // Persist
    try {
      if (IS_DEV) {
        await devSaveCreature(clean, originalKey)
      } else {
        await prodSaveCreature(clean, originalKey)
      }
      clearCreaturesDirty()
    } catch (err) {
      markCreaturesDirty()
      throw err
    }
  }, [])

  // ── Delete a creature ─────────────────────────────────────────────────────

  const deleteCreature = useCallback(async (name, actualKey) => {
    // actualKey is the real map key (e.g. "Creatures.00dpnnui")
    const key = actualKey || creatureKey(name)

    // Optimistic local update
    setMonsterMap((prev) => {
      const next = new Map(prev)
      next.delete(key)
      return next
    })

    // Persist - server needs the key to find the right entry
    try {
      if (IS_DEV) {
        await devDeleteCreature(name, key)
      } else {
        await prodDeleteCreature(name, key)
      }
      clearCreaturesDirty()
    } catch (err) {
      markCreaturesDirty()
      throw err
    }
  }, [])

  // ── Lookup helper ─────────────────────────────────────────────────────────

  const hasCreature = useCallback(
    (name) => [...monsterMap.values()].some((m) => m.Name === name),
    [monsterMap]
  )

  return {
    monsters,
    pcs,
    all: [...pcs, ...monsters],
    saveCreature,
    deleteCreature,
    hasCreature,
    isLoading,
  }
}
