import { useMemo } from 'react'
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

export function useLibrary() {
  return useMemo(() => {
    // Monsters: all top-level keys starting with "Creatures."
    const monsters = Object.entries(rawData)
      .filter(([k]) => k.startsWith('Creatures.'))
      .map(([, v]) => ({ ...v, _libType: 'monster' }))
      .sort((a, b) => a.Name.localeCompare(b.Name))

    // PCs: PersistentCharacters is the library of saved PCs in Improved Initiative
    const pcArrays = [
      ...safeParse(rawData['ImprovedInitiative.PersistentCharacters']),
      ...safeParse(rawData['ImprovedInitiative.PlayerCharacters']),
    ]
    const seen = new Set()
    const pcs = pcArrays
      .filter((pc) => {
        if (!pc.Name || seen.has(pc.Name)) return false
        seen.add(pc.Name)
        return true
      })
      .map((pc) => ({ ...pc, _libType: 'pc' }))
      .sort((a, b) => a.Name.localeCompare(b.Name))

    return { monsters, pcs, all: [...pcs, ...monsters] }
  }, [])
}
