// ── Dice ─────────────────────────────────────────────────────────────────────
export const d20 = () => Math.floor(Math.random() * 20) + 1

export const abilityMod = (score) => Math.floor((score - 10) / 2)
export const formatMod = (mod) => (mod >= 0 ? `+${mod}` : String(mod))

export const getInitiativeMod = (statblock) => {
  if (!statblock) return 0
  if (typeof statblock.InitiativeModifier === 'number') return statblock.InitiativeModifier
  const dex = statblock.Abilities?.Dex ?? 10
  return abilityMod(dex)
}

export const rollInitiative = (statblock) => d20() + getInitiativeMod(statblock)

// ── IDs ──────────────────────────────────────────────────────────────────────
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

// ── Conditions ───────────────────────────────────────────────────────────────
export const CONDITIONS = [
  { name: 'Blinded',       color: 'bg-slate-600/70 text-slate-200' },
  { name: 'Charmed',       color: 'bg-pink-900/70 text-pink-200' },
  { name: 'Concentration', color: 'bg-blue-900/70 text-blue-200' },
  { name: 'Dazed',         color: 'bg-teal-900/70 text-teal-200', info: 'When a creature is dazed it can only use its action, bonus action or movement on its turn, not all three.' },
  { name: 'Deafened',      color: 'bg-zinc-600/70 text-zinc-300' },
  { name: 'Exhaustion',    color: 'bg-rose-900/70 text-rose-200' },
  { name: 'Frightened',    color: 'bg-purple-900/70 text-purple-200' },
  { name: 'Grappled',      color: 'bg-orange-900/60 text-orange-200' },
  { name: 'Incapacitated', color: 'bg-red-900/60 text-red-300' },
  { name: 'Invisible',     color: 'bg-cyan-900/60 text-cyan-200' },
  { name: 'Paralyzed',     color: 'bg-yellow-900/60 text-yellow-200' },
  { name: 'Petrified',     color: 'bg-stone-600/60 text-stone-300' },
  { name: 'Poisoned',      color: 'bg-green-900/60 text-green-200' },
  { name: 'Prone',         color: 'bg-amber-900/50 text-amber-200' },
  { name: 'Restrained',    color: 'bg-orange-800/50 text-orange-200' },
  { name: 'Stunned',       color: 'bg-violet-900/60 text-violet-200' },
  { name: 'Unconscious',   color: 'bg-slate-800/80 text-slate-400' },
]

export const getConditionColor = (name) =>
  CONDITIONS.find((c) => c.name === name)?.color ?? 'bg-slate-700/60 text-slate-300'

// ── Damage type colors ────────────────────────────────────────────────────────
export const DAMAGE_TYPE_COLORS = {
  fire:        '#f87171', // red-400
  cold:        '#60a5fa', // blue-400
  lightning:   '#facc15', // yellow-400
  thunder:     '#a78bfa', // violet-400
  acid:        '#4ade80', // green-400
  poison:      '#86efac', // green-300
  necrotic:    '#a8a29e', // stone-400
  radiant:     '#fde68a', // amber-200
  force:       '#c084fc', // purple-400
  psychic:     '#f0abfc', // fuchsia-300
  bludgeoning: '#d6d3d1', // stone-300
  piercing:    '#d6d3d1',
  slashing:    '#d6d3d1',
}

export function getDamageTypeColor(type) {
  if (!type) return null
  const key = type.toLowerCase().trim()
  return DAMAGE_TYPE_COLORS[key] ?? null
}
