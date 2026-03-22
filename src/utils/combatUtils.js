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
  { name: 'Blinded',       color: 'bg-slate-600/70 text-slate-200',    info: "Can't see. Auto-fail sight checks. Attacks have disadvantage, attacks against have advantage." },
  { name: 'Charmed',       color: 'bg-pink-900/70 text-pink-200',      info: "Can't attack the charmer. Charmer has advantage on social checks." },
  { name: 'Concentration', color: 'bg-blue-900/70 text-blue-200',      info: 'Maintaining a concentration spell. Con save on damage (DC 10 or half damage, whichever is higher).' },
  { name: 'Dazed',         color: 'bg-teal-900/70 text-teal-200',      info: 'Can only use action, bonus action, or movement on its turn — not all three.' },
  { name: 'Deafened',      color: 'bg-zinc-600/70 text-zinc-300',      info: "Can't hear. Auto-fail hearing checks." },
  { name: 'Exhaustion',    color: 'bg-rose-900/70 text-rose-200',      info: 'Levels 1-6. Subtract level from d20 rolls. Speed reduced. Level 6 = death.' },
  { name: 'Frightened',    color: 'bg-purple-900/70 text-purple-200',  info: "Disadvantage on ability checks and attacks while source of fear is in sight. Can't willingly move closer." },
  { name: 'Grappled',      color: 'bg-orange-900/60 text-orange-200',  info: 'Speed becomes 0. Ends if grappler is incapacitated or moved out of reach.' },
  { name: 'Incapacitated', color: 'bg-red-900/60 text-red-300',        info: "Can't take actions or reactions." },
  { name: 'Invisible',     color: 'bg-cyan-900/60 text-cyan-200',      info: "Can't be seen without magic/special sense. Attacks have advantage, attacks against have disadvantage." },
  { name: 'Paralyzed',     color: 'bg-yellow-900/60 text-yellow-200',  info: "Incapacitated, can't move or speak. Auto-fail Str/Dex saves. Attacks have advantage, melee hits are crits." },
  { name: 'Petrified',     color: 'bg-stone-600/60 text-stone-300',    info: 'Turned to stone. Weight x10. Incapacitated. Resistance to all damage. Immune to poison/disease.' },
  { name: 'Poisoned',      color: 'bg-green-900/60 text-green-200',    info: 'Disadvantage on attack rolls and ability checks.' },
  { name: 'Prone',         color: 'bg-amber-900/50 text-amber-200',    info: 'Disadvantage on attacks. Melee attacks against have advantage, ranged have disadvantage. Must use half movement to stand.' },
  { name: 'Restrained',    color: 'bg-orange-800/50 text-orange-200',  info: 'Speed 0. Attacks have disadvantage. Attacks against have advantage. Disadvantage on Dex saves.' },
  { name: 'Stunned',       color: 'bg-violet-900/60 text-violet-200',  info: "Incapacitated, can't move, can speak only falteringly. Auto-fail Str/Dex saves. Attacks against have advantage." },
  { name: 'Unconscious',   color: 'bg-slate-800/80 text-slate-400',    info: "Incapacitated, can't move or speak. Drops held items, falls prone. Auto-fail Str/Dex saves. Attacks have advantage, melee hits are crits." },
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
  necrotic:    '#b5cc8e', // sickly pale green
  radiant:     '#fde68a', // amber-200
  force:       '#c084fc', // purple-400
  psychic:     '#f0abfc', // fuchsia-300
  bludgeoning: '#a8a29e', // stone-400 (gray)
  piercing:    '#a8a29e',
  slashing:    '#a8a29e',
}

export function getDamageTypeColor(type) {
  if (!type) return null
  const key = type.toLowerCase().trim()
  return DAMAGE_TYPE_COLORS[key] ?? null
}
