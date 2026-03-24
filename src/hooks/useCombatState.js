import { useReducer, useEffect } from 'react'
import { uid, rollInitiative } from '../utils/combatUtils'

const STORAGE_KEY = 'mythranos-combat-v1'

const init = { combatants: [], activeTurnId: null }

// ── Helpers ───────────────────────────────────────────────────────────────────
export function sortByInitiative(list) {
  return [...list].sort((a, b) => (b.initiative ?? -1) - (a.initiative ?? -1))
}

// ── Reducer ───────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const newList = [...state.combatants, action.payload]
      // Auto-sort whenever the new entry has an initiative value
      return {
        ...state,
        combatants: action.payload.initiative !== null
          ? sortByInitiative(newList)
          : newList,
      }
    }
    case 'REMOVE': {
      const next = state.combatants.filter((c) => c.id !== action.id)
      return {
        ...state,
        combatants: next,
        activeTurnId: next.some((c) => c.id === state.activeTurnId) ? state.activeTurnId : null,
      }
    }
    case 'SET_INITIATIVES': {
      const updated = state.combatants.map((c) =>
        action.map[c.id] !== undefined ? { ...c, initiative: action.map[c.id] } : c
      )
      return { ...state, combatants: sortByInitiative(updated) }
    }
    case 'SET_ACTIVE':
      return { ...state, activeTurnId: action.id }
    case 'NEXT_TURN': {
      const { combatants, activeTurnId } = state
      if (!combatants.length) return state
      const idx = combatants.findIndex((c) => c.id === activeTurnId)
      const nextId = combatants[(idx + 1) % combatants.length].id
      // Auto-clear legendary action usage for the combatant whose turn starts
      const updated = combatants.map((c) => {
        if (c.id !== nextId) return c
        if (!c.statblock?.LegendaryActions?.length) return c
        const newUsage = { ...(c.usage ?? {}) }
        delete newUsage['__Legendary Actions']
        return { ...c, usage: newUsage }
      })
      return { ...state, combatants: updated, activeTurnId: nextId }
    }
    case 'DAMAGE':
      return {
        ...state,
        combatants: state.combatants.map((c) =>
          c.id === action.id && c.hp
            ? { ...c, hp: { ...c.hp, current: Math.max(0, c.hp.current - action.amount) } }
            : c
        ),
      }
    case 'HEAL':
      return {
        ...state,
        combatants: state.combatants.map((c) =>
          c.id === action.id && c.hp
            ? { ...c, hp: { ...c.hp, current: Math.min(c.hp.max, c.hp.current + action.amount) } }
            : c
        ),
      }
    case 'ADD_CONDITION':
      return {
        ...state,
        combatants: state.combatants.map((c) =>
          c.id === action.id ? { ...c, conditions: [...c.conditions, action.condition] } : c
        ),
      }
    case 'REMOVE_CONDITION':
      return {
        ...state,
        combatants: state.combatants.map((c) =>
          c.id === action.id
            ? { ...c, conditions: c.conditions.filter((x) => x.id !== action.condId) }
            : c
        ),
      }
    case 'REORDER':
      return { ...state, combatants: action.list }
    case 'UPDATE_USAGE':
      return {
        ...state,
        combatants: state.combatants.map((c) =>
          c.id === action.id
            ? { ...c, usage: { ...(c.usage ?? {}), [action.key]: action.value } }
            : c
        ),
      }
    case 'RENAME':
      return {
        ...state,
        combatants: state.combatants.map((c) =>
          c.id === action.id ? { ...c, name: action.name } : c
        ),
      }
    case 'CLEAR':
      return init
    default:
      return state
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useCombatState() {
  const [state, dispatch] = useReducer(reducer, init, (base) => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : base
    } catch {
      return base
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  function disambiguate(name) {
    const existing = state.combatants.filter(
      (c) => c.name === name || c.name.match(new RegExp(`^${name} \\d+$`))
    )
    if (!existing.length) return name

    // Rename the first unnumbered instance to "Name 1"
    const unnumbered = state.combatants.find((c) => c.name === name)
    if (unnumbered) {
      dispatch({ type: 'RENAME', id: unnumbered.id, name: `${name} 1` })
    }

    const numbered = state.combatants
      .map((c) => {
        const m = c.name.match(new RegExp(`^${name}( (\\d+))?$`))
        return m ? (m[2] ? parseInt(m[2]) : 1) : null
      })
      .filter((n) => n !== null)
    const max = numbered.length ? Math.max(...numbered) : 0
    return `${name} ${max + 1}`
  }

  // Check if a statblock describes a minion (has "minion" in trait text)
  function isMinion(statblock) {
    if (!statblock?.Traits) return false
    return statblock.Traits.some((t) => {
      const text = `${t.Name ?? ''} ${t.Content ?? ''} ${t.Description ?? ''}`.toLowerCase()
      return text.includes('minion')
    })
  }

  // Find existing minion initiative for a creature base name
  function findMinionInitiative(baseName) {
    for (const c of state.combatants) {
      // Match same base creature name (before the disambiguation number)
      const cBase = c.name.replace(/\s+\d+$/, '')
      if (cBase === baseName && c.initiative != null && isMinion(c.statblock)) {
        return c.initiative
      }
    }
    return null
  }

  const add = (entry) => {
    const name = entry.type === 'lair' ? 'Lair Action' : disambiguate(entry.name)

    // PCs roll manually; everything else gets an auto-rolled initiative
    // Minions share initiative with existing minions of same base name
    let initiative
    if (entry.type === 'lair') {
      initiative = 20
    } else if (entry.type === 'pc') {
      initiative = null
    } else if (isMinion(entry.statblock)) {
      const existing = findMinionInitiative(entry.name)
      initiative = existing ?? rollInitiative(entry.statblock)
    } else {
      initiative = rollInitiative(entry.statblock)
    }

    const c = {
      id: uid(),
      type: entry.type,
      name,
      initiative,
      ac: entry.ac ?? null,
      hp: entry.hp ?? null,
      conditions: [],
      statblock: entry.statblock ?? null,
      usage: {},
    }
    dispatch({ type: 'ADD', payload: c })
    return c
  }

  const remove        = (id)           => dispatch({ type: 'REMOVE', id })
  const setInitiatives= (map)          => dispatch({ type: 'SET_INITIATIVES', map })
  const setActive     = (id)           => dispatch({ type: 'SET_ACTIVE', id })
  const nextTurn      = ()             => dispatch({ type: 'NEXT_TURN' })
  const addCondition  = (id, cond)     => dispatch({ type: 'ADD_CONDITION', id, condition: cond })
  const removeCondition=(id, condId)   => dispatch({ type: 'REMOVE_CONDITION', id, condId })
  const reorder       = (list)         => dispatch({ type: 'REORDER', list })
  const clear         = ()             => dispatch({ type: 'CLEAR' })
  const updateUsage   = (id, key, val) => dispatch({ type: 'UPDATE_USAGE', id, key, value: val })

  const applyDamage = (id, amount) => {
    if (amount >= 0) dispatch({ type: 'DAMAGE', id, amount })
    else             dispatch({ type: 'HEAL',   id, amount: -amount })
  }

  return {
    combatants: state.combatants,
    activeTurnId: state.activeTurnId,
    add, remove, setInitiatives, setActive, nextTurn,
    applyDamage, addCondition, removeCondition, reorder, clear, updateUsage,
  }
}
