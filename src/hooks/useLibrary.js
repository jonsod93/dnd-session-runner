import { useMemo, useState, useCallback } from 'react'
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
const LS_EDITS_KEY = 'mythranos:creature-edits'
const LS_DELETES_KEY = 'mythranos:creature-deletes'

// Dev mode: write to the JSON file on disk via Vite dev-server plugin
async function apiSaveCreature(statblock, oldKey) {
  if (!IS_DEV) return { ok: true, local: true }
  const res = await fetch('/api/library/creature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ statblock, key: oldKey || undefined }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to save creature')
  return data
}

async function apiDeleteCreature(name) {
  if (!IS_DEV) return { ok: true, local: true }
  const res = await fetch('/api/library/creature', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to delete creature')
  return data
}

// Production mode: persist edits and deletions to localStorage
function loadLocalEdits() {
  try {
    const raw = localStorage.getItem(LS_EDITS_KEY)
    return raw ? JSON.parse(raw) : {} // { [creatureKey]: statblock }
  } catch {
    return {}
  }
}

function loadLocalDeletes() {
  try {
    const raw = localStorage.getItem(LS_DELETES_KEY)
    return raw ? JSON.parse(raw) : [] // [creatureKey, ...]
  } catch {
    return []
  }
}

function saveLocalEdit(key, statblock, oldKey) {
  const edits = loadLocalEdits()
  if (oldKey && oldKey !== key) delete edits[oldKey]
  edits[key] = statblock
  localStorage.setItem(LS_EDITS_KEY, JSON.stringify(edits))
  // If this creature was previously deleted, un-delete it
  const deletes = loadLocalDeletes().filter((k) => k !== key)
  localStorage.setItem(LS_DELETES_KEY, JSON.stringify(deletes))
}

function saveLocalDelete(key) {
  // Add to deletes list
  const deletes = loadLocalDeletes()
  if (!deletes.includes(key)) deletes.push(key)
  localStorage.setItem(LS_DELETES_KEY, JSON.stringify(deletes))
  // Remove from edits if present
  const edits = loadLocalEdits()
  delete edits[key]
  localStorage.setItem(LS_EDITS_KEY, JSON.stringify(edits))
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useLibrary() {
  // Mutable copy of monsters, seeded from the static import + localStorage overrides
  const [monsterMap, setMonsterMap] = useState(() => {
    const map = new Map()

    // 1. Load bundled creatures
    Object.entries(rawData)
      .filter(([k]) => k.startsWith('Creatures.'))
      .forEach(([k, v]) => {
        map.set(k, {
          ...v,
          _libType: 'monster',
          _key: k,
          ChallengeRating: v.ChallengeRating ?? v.Challenge ?? null,
        })
      })

    // 2. In production, apply localStorage edits and deletions
    if (!IS_DEV) {
      const edits = loadLocalEdits()
      for (const [k, v] of Object.entries(edits)) {
        map.set(k, {
          ...v,
          _libType: 'monster',
          _key: k,
          ChallengeRating: v.ChallengeRating ?? v.Challenge ?? null,
        })
      }
      const deletes = loadLocalDeletes()
      for (const k of deletes) {
        map.delete(k)
      }
    }

    return map
  })

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

  // ── Add or update a creature (writes to JSON file) ──────────────────────────

  const saveCreature = useCallback(async (statblock, originalName) => {
    const oldKey = originalName ? creatureKey(originalName) : null

    // Optimistic local update
    setMonsterMap((prev) => {
      const next = new Map(prev)
      // Remove old key if renaming
      if (oldKey && oldKey !== creatureKey(statblock.Name)) {
        next.delete(oldKey)
      }
      const key = creatureKey(statblock.Name)
      next.set(key, {
        ...statblock,
        _libType: 'monster',
        _key: key,
        ChallengeRating: statblock.ChallengeRating ?? statblock.Challenge ?? null,
      })
      return next
    })

    // Strip internal fields before persisting
    const { _libType, _key, _custom, ...clean } = statblock

    // Persist: dev writes to JSON file, production writes to localStorage
    if (IS_DEV) {
      await apiSaveCreature(clean, oldKey)
    } else {
      saveLocalEdit(creatureKey(statblock.Name), clean, oldKey)
    }
  }, [])

  // ── Delete a creature (writes to JSON file) ────────────────────────────────

  const deleteCreature = useCallback(async (name) => {
    const key = creatureKey(name)

    // Optimistic local update
    setMonsterMap((prev) => {
      const next = new Map(prev)
      next.delete(key)
      return next
    })

    // Persist: dev writes to JSON file, production writes to localStorage
    if (IS_DEV) {
      await apiDeleteCreature(name)
    } else {
      saveLocalDelete(creatureKey(name))
    }
  }, [])

  // ── Lookup helper ──────────────────────────────────────────────────────────

  const hasCreature = useCallback(
    (name) => monsterMap.has(creatureKey(name)),
    [monsterMap]
  )

  return {
    monsters,
    pcs,
    all: [...pcs, ...monsters],
    saveCreature,
    deleteCreature,
    hasCreature,
  }
}
