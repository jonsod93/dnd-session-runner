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

// ── API helpers (write to the JSON file on disk via Vite dev-server plugin) ──

async function apiSaveCreature(statblock, oldKey) {
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
  const res = await fetch('/api/library/creature', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to delete creature')
  return data
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useLibrary() {
  // Mutable copy of monsters, seeded from the static import
  const [monsterMap, setMonsterMap] = useState(() => {
    const map = new Map()
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

    // Persist to disk
    await apiSaveCreature(clean, oldKey)
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

    // Persist to disk
    await apiDeleteCreature(name)
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
