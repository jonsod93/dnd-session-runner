import { useMemo, useState, useCallback } from 'react'
import rawData from '../data/improved-initiative.json'

const CUSTOM_KEY = 'mythranos-custom-statblocks-v1'

function safeParse(val) {
  if (!val) return []
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : val
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function loadCustom() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]')
  } catch {
    return []
  }
}

function saveCustom(list) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(list))
}

export function useLibrary() {
  const [custom, setCustom] = useState(loadCustom)

  const base = useMemo(() => {
    // Monsters: all top-level keys starting with "Creatures."
    const monsters = Object.entries(rawData)
      .filter(([k]) => k.startsWith('Creatures.'))
      .map(([, v]) => ({ ...v, _libType: 'monster' }))
      .sort((a, b) => a.Name.localeCompare(b.Name))

    // PCs: top-level "PersistentCharacters.<hash>" keys + legacy array formats
    const topLevelPCs = Object.entries(rawData)
      .filter(([k]) => k.startsWith('PersistentCharacters.'))
      .map(([, v]) => v)
    const legacyPCs = [
      ...safeParse(rawData['ImprovedInitiative.PersistentCharacters']),
      ...safeParse(rawData['ImprovedInitiative.PlayerCharacters']),
    ]
    const seen = new Set()
    const pcs = [...topLevelPCs, ...legacyPCs]
      .filter((pc) => {
        if (!pc.Name || seen.has(pc.Name)) return false
        seen.add(pc.Name)
        return true
      })
      .map((pc) => ({ ...pc, _libType: 'pc' }))
      .sort((a, b) => a.Name.localeCompare(b.Name))

    return { monsters, pcs }
  }, [])

  // Merge custom statblocks into monster list
  const monsters = useMemo(() => {
    const customMonsters = custom
      .filter((c) => c._libType !== 'pc')
      .map((c) => ({ ...c, _libType: 'monster', _custom: true }))
    return [...customMonsters, ...base.monsters]
  }, [base.monsters, custom])

  const pcs = base.pcs

  const addCustomStatblock = useCallback((statblock) => {
    setCustom((prev) => {
      const next = [...prev, { ...statblock, _custom: true }]
      saveCustom(next)
      return next
    })
  }, [])

  const updateCustomStatblock = useCallback((index, statblock) => {
    setCustom((prev) => {
      const next = [...prev]
      next[index] = { ...statblock, _custom: true }
      saveCustom(next)
      return next
    })
  }, [])

  const removeCustomStatblock = useCallback((index) => {
    setCustom((prev) => {
      const next = prev.filter((_, i) => i !== index)
      saveCustom(next)
      return next
    })
  }, [])

  const getCustomIndex = useCallback((name) => {
    return custom.findIndex((c) => c.Name === name)
  }, [custom])

  return {
    monsters,
    pcs,
    all: [...pcs, ...monsters],
    custom,
    addCustomStatblock,
    updateCustomStatblock,
    removeCustomStatblock,
    getCustomIndex,
  }
}
