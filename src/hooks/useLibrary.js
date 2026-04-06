import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import rawData from '../data/improved-initiative.json'
import bundledPCs from '../data/pcs.json'

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
const LS_PCS_CACHE_KEY = 'mythranos:pcs-cache'
const LS_PCS_DIRTY_KEY = 'mythranos:pcs-dirty'
const LS_PCS_MIGRATED_KEY = 'mythranos:pcs-migrated-v1'

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

  // ── PCs — synced via blob storage ───────────────────────────────────────

  const [pcList, setPcList] = useState(() => {
    if (!IS_DEV) {
      try {
        const cached = localStorage.getItem(LS_PCS_CACHE_KEY)
        if (cached) return JSON.parse(cached)
      } catch {}
    }
    return bundledPCs
  })
  const hasFetchedPCs = useRef(false)

  // Sync PCs from server on mount (production)
  useEffect(() => {
    if (IS_DEV || hasFetchedPCs.current) return
    hasFetchedPCs.current = true

    // Migrate old localStorage PCs to server if present.
    // Guarded by a persistent marker so a restored localStorage snapshot
    // (browser sync, profile copy, backup) can never re-trigger the merge
    // and silently overwrite current server state with stale data.
    async function migrateLegacyPCs() {
      if (localStorage.getItem(LS_PCS_MIGRATED_KEY) === '1') return
      try {
        const oldCustom = localStorage.getItem('mythranos:custom-pcs')
        const oldHidden = localStorage.getItem('mythranos:hidden-pcs')
        if (!oldCustom && !oldHidden) {
          // Nothing to migrate; mark as done so we never check again.
          try { localStorage.setItem(LS_PCS_MIGRATED_KEY, '1') } catch {}
          return
        }

        const custom = oldCustom ? JSON.parse(oldCustom) : []
        const hidden = new Set(oldHidden ? JSON.parse(oldHidden) : [])
        if (custom.length === 0 && hidden.size === 0) {
          try { localStorage.setItem(LS_PCS_MIGRATED_KEY, '1') } catch {}
          return
        }

        console.log('[useLibrary] Migrating legacy PC data to server...')
        // Fetch current server PCs, apply hidden + custom changes
        const res = await fetch('/api/pcs')
        const serverPCs = res.ok ? await res.json() : bundledPCs
        const merged = serverPCs.filter((pc) => !hidden.has(pc.Name))
        for (const pc of custom) {
          const idx = merged.findIndex((p) => p.Name === pc.Name)
          const clean = { Name: pc.Name }
          if (pc.AC != null) clean.AC = pc.AC
          if (idx >= 0) merged[idx] = clean
          else merged.push(clean)
        }
        await fetch('/api/pcs', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ pcs: merged }),
        })
        localStorage.removeItem('mythranos:custom-pcs')
        localStorage.removeItem('mythranos:hidden-pcs')
        try { localStorage.setItem(LS_PCS_MIGRATED_KEY, '1') } catch {}
        console.log('[useLibrary] Legacy PC migration complete')
        return merged
      } catch (err) {
        console.warn('[useLibrary] Legacy PC migration failed:', err.message)
        return null
      }
    }

    async function syncPCs() {
      try {
        const migrated = await migrateLegacyPCs()
        if (migrated) {
          setPcList(migrated)
          try { localStorage.setItem(LS_PCS_CACHE_KEY, JSON.stringify(migrated)) } catch {}
          return
        }

        if (localStorage.getItem(LS_PCS_DIRTY_KEY) === '1') {
          console.log('[useLibrary] PCs have unsynced local changes, keeping local data')
          return
        }

        const res = await fetch('/api/pcs')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setPcList(data)
        try { localStorage.setItem(LS_PCS_CACHE_KEY, JSON.stringify(data)) } catch {}
      } catch (err) {
        console.warn('[useLibrary] Failed to sync PCs from server:', err.message)
      }
    }

    syncPCs()
  }, [])

  const pcs = useMemo(() => {
    const seen = new Set()
    return pcList
      .filter((pc) => {
        if (!pc.Name || seen.has(pc.Name)) return false
        seen.add(pc.Name)
        return true
      })
      .map((pc) => ({ ...pc, _libType: 'pc' }))
      .sort((a, b) => a.Name.localeCompare(b.Name))
  }, [pcList])

  // Cache the current PC list to localStorage. Always called after a state
  // mutation so the cached snapshot stays in sync with what the user sees.
  const cachePCList = (list) => {
    try { localStorage.setItem(LS_PCS_CACHE_KEY, JSON.stringify(list)) } catch {}
  }

  // Incremental upsert: send a single PC to the server. This avoids the
  // last-write-wins clobber that the previous full-list replacement caused
  // when two devices edited different PCs at the same time.
  const persistPCUpsert = useCallback(async (pc, originalName) => {
    const { _libType, _custom, ...clean } = pc
    try {
      const url = IS_DEV ? '/api/library/pcs' : '/api/pcs'
      const headers = IS_DEV ? { 'Content-Type': 'application/json' } : authHeaders()
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ pc: clean, originalName: originalName || undefined }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      try { localStorage.removeItem(LS_PCS_DIRTY_KEY) } catch {}
    } catch (err) {
      try { localStorage.setItem(LS_PCS_DIRTY_KEY, '1') } catch {}
      console.warn('[useLibrary] Failed to upsert PC to server:', err.message)
    }
  }, [])

  // Incremental delete: remove a single PC by name on the server.
  const persistPCDelete = useCallback(async (name) => {
    try {
      const url = IS_DEV ? '/api/library/pcs' : '/api/pcs'
      const headers = IS_DEV ? { 'Content-Type': 'application/json' } : authHeaders()
      const res = await fetch(url, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      try { localStorage.removeItem(LS_PCS_DIRTY_KEY) } catch {}
    } catch (err) {
      try { localStorage.setItem(LS_PCS_DIRTY_KEY, '1') } catch {}
      console.warn('[useLibrary] Failed to delete PC on server:', err.message)
    }
  }, [])

  const savePC = useCallback((name, originalName, ac) => {
    const acVal = ac != null && ac !== '' ? Number(ac) : undefined
    const entry = { Name: name }
    if (acVal != null) entry.AC = acVal

    setPcList((prev) => {
      let next
      if (originalName) {
        const idx = prev.findIndex((pc) => pc.Name === originalName)
        if (idx >= 0) {
          next = [...prev]
          next[idx] = entry
        } else {
          next = [...prev, entry]
        }
      } else {
        next = [...prev, entry]
      }
      cachePCList(next)
      return next
    })
    persistPCUpsert(entry, originalName)
  }, [persistPCUpsert])

  const deletePC = useCallback((name) => {
    setPcList((prev) => {
      const next = prev.filter((pc) => pc.Name !== name)
      cachePCList(next)
      return next
    })
    persistPCDelete(name)
  }, [persistPCDelete])

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
    savePC,
    deletePC,
    isLoading,
  }
}
