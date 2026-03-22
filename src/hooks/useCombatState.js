import { useReducer, useEffect } from 'react'
import { uid } from '../utils/combatUtils'

const STORAGE_KEY = 'mythranos-combat-v1'

// ── State shape ───────────────────────────────────────────────────────────────
// combatant: { id, type ('pc'|'monster'|'lair'|'quick'), name, initiative,
//              ac, hp: {current,max}|null, conditions: [], statblock: {}|null }

const init = { combatants: [], activeTurnId: null }

// ── Helpers ───────────────────────────────────────────────────────────────────
export function sortByInitiative(list) {
  const lair = list.filter((c) => c.type === 'lair')
  const rest = list.filter((c) => c.type !== 'lair')
  rest.sort((a, b) => (b.initiative ?? -1) - (a.initiative ?? -1))
  return [...lair, ...rest]
}

// ── Reducer ───────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      return { ...state, combatants: [...state.combatants, action.payload] }
    }
    case 'REMOVE': {
      const next = state.combatants.filter((c) => c.id !== action.id)
      return {
        ...state,
        combatants: next,
        activeTurnId: next.some((c) => c.id === state.activeTurnId)
          ? state.activeTurnId
          : null,
      }
    }
    case 'SET_INITIATIVES': {
      // action.map: { [id]: number }
      const updated = state.combatants.map((c) =>
        action.map[c.id] !== undefined ? { ...c, initiative: action.map[c.id] } : c
      )
      return { ...state, combatants: sortByInitiative(updated) }
    }
    case 'SET_ACTIVE': {
      return { ...state, activeTurnId: action.id }
    }
    case 'NEXT_TURN': {
      const { combatants, activeTurnId } = state
      if (!combatants.length) return state
      const idx = combatants.findIndex((c) => c.id === activeTurnId)
      const next = combatants[(idx + 1) % combatants.length]
      return { ...state, activeTurnId: next.id }
    }
    case 'DAMAGE': {
      return {
        ...state,
        combatants: state.combatants.map((c) =>
          c.id === action.id && c.hp
            ? { ...c, hp: { ...c.hp, current: Math.max(0, c.hp.current - action.amount) } }
            : c
        ),
      }
    }
    case 'HEAL': {
      return {
        ...state,
        combatants: state.combatants.map((c) =>
          c.id === action.id && c.hp
            ? { ...c, hp: { ...c.hp, current: Math.min(c.hp.max, c.hp.current + action.amount) } }
            : c
        ),
      }
    }
    case 'ADD_CONDITION': {
      return {
        ...state,
        combatants: state.combatants.map((c) =>
          c.id === action.id
            ? { ...c, conditions: [...c.conditions, action.condition] }
            : c
        ),
      }
    }
    case 'REMOVE_CONDITION': {
      return {
        ...state,
        combatants: state.combatants.map((c) =>
          c.id === action.id
            ? { ...c, conditions: c.conditions.filter((x) => x.id !== action.condId) }
            : c
        ),
      }
    }
    case 'REORDER': {
      // Keep lair actions locked to front
      const lair = action.list.filter((c) => c.type === 'lair')
      const rest = action.list.filter((c) => c.type !== 'lair')
      return { ...state, combatants: [...lair, ...rest] }
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

  // ── Named disambiguator for duplicate names ───────────────────────────────
  function disambiguate(name) {
    const existing = state.combatants.filter(
      (c) => c.name === name || c.name.match(new RegExp(`^${name} \\d+$`))
    )
    if (!existing.length) return name
    // Find the base name entries (exact match without number suffix)
    const numbered = state.combatants
      .map((c) => {
        const m = c.name.match(new RegExp(`^${name}( (\\d+))?$`))
        return m ? (m[2] ? parseInt(m[2]) : 1) : null
      })
      .filter((n) => n !== null)
    const max = numbered.length ? Math.max(...numbered) : 0
    return `${name} ${max + 1}`
  }

  const add = (entry) => {
    const name = entry.type === 'lair' ? 'Lair Action' : disambiguate(entry.name)
    const c = {
      id: uid(),
      type: entry.type,
      name,
      initiative: entry.type === 'lair' ? 20 : null,
      ac: entry.ac ?? null,
      hp: entry.hp ?? null,
      conditions: [],
      statblock: entry.statblock ?? null,
    }
    dispatch({ type: 'ADD', payload: c })
    return c
  }

  const remove = (id) => dispatch({ type: 'REMOVE', id })

  const setInitiatives = (map) => dispatch({ type: 'SET_INITIATIVES', map })

  const setActive = (id) => dispatch({ type: 'SET_ACTIVE', id })

  const nextTurn = () => dispatch({ type: 'NEXT_TURN' })

  const applyDamage = (id, amount) => {
    if (amount >= 0) dispatch({ type: 'DAMAGE', id, amount })
    else dispatch({ type: 'HEAL', id, amount: -amount })
  }

  const addCondition = (id, condition) => dispatch({ type: 'ADD_CONDITION', id, condition })

  const removeCondition = (id, condId) => dispatch({ type: 'REMOVE_CONDITION', id, condId })

  const reorder = (list) => dispatch({ type: 'REORDER', list })

  const clear = () => dispatch({ type: 'CLEAR' })

  return {
    combatants: state.combatants,
    activeTurnId: state.activeTurnId,
    add,
    remove,
    setInitiatives,
    setActive,
    nextTurn,
    applyDamage,
    addCondition,
    removeCondition,
    reorder,
    clear,
  }
}
