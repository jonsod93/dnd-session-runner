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
  { name: 'Blinded',       color: 'bg-[#3a3a4a] text-[#e0e0f0]',       info: "Can't see. Auto-fail sight checks. Attacks have disadvantage, attacks against have advantage." },
  { name: 'Charmed',       color: 'bg-[#5c2840] text-[#f0d0dd]',       info: "Can't attack the charmer. Charmer has advantage on social checks." },
  { name: 'Concentration', color: 'bg-[#1e3858] text-[#a0d0f0]',       info: 'Maintaining a concentration spell. Con save on damage (DC 10 or half damage, whichever is higher).' },
  { name: 'Dazed',         color: 'bg-[#1e4038] text-[#a0e0d0]',       info: 'Can only use action, bonus action, or movement on its turn - not all three.' },
  { name: 'Deafened',      color: 'bg-[#383838] text-[#c8c8c8]',       info: "Can't hear. Auto-fail hearing checks." },
  { name: 'Exhaustion',    color: 'bg-[#5c2020] text-[#f0c0c0]',       info: 'Levels 1-6. Subtract level from d20 rolls. Speed reduced. Level 6 = death.' },
  { name: 'Frightened',    color: 'bg-[#482058] text-[#ddb0f0]',       info: "Disadvantage on ability checks and attacks while source of fear is in sight. Can't willingly move closer." },
  { name: 'Grappled',      color: 'bg-[#4a3820] text-[#e8d0a0]',       info: 'Speed becomes 0. Ends if grappler is incapacitated or moved out of reach.' },
  { name: 'Incapacitated', color: 'bg-[#602020] text-[#f0c0c0]',       info: "Can't take actions or reactions." },
  { name: 'Invisible',     color: 'bg-[#1e3850] text-[#a0d8f0]',       info: "Can't be seen without magic/special sense. Attacks have advantage, attacks against have disadvantage." },
  { name: 'Paralyzed',     color: 'bg-[#4a4420] text-[#f0e0a0]',       info: "Incapacitated, can't move or speak. Auto-fail Str/Dex saves. Attacks have advantage, melee hits are crits." },
  { name: 'Petrified',     color: 'bg-[#3a3a38] text-[#d0d0c8]',       info: 'Turned to stone. Weight x10. Incapacitated. Resistance to all damage. Immune to poison/disease.' },
  { name: 'Poisoned',      color: 'bg-[#1e4020] text-[#a0e8a0]',       info: 'Disadvantage on attack rolls and ability checks.' },
  { name: 'Prone',         color: 'bg-[#4a3820] text-[#e8d0a0]',       info: 'Disadvantage on attacks. Melee attacks against have advantage, ranged have disadvantage. Must use half movement to stand.' },
  { name: 'Restrained',    color: 'bg-[#4a3820] text-[#e8d0a0]',       info: 'Speed 0. Attacks have disadvantage. Attacks against have advantage. Disadvantage on Dex saves.' },
  { name: 'Stunned',       color: 'bg-[#482058] text-[#ddb0f0]',       info: "Incapacitated, can't move, can speak only falteringly. Auto-fail Str/Dex saves. Attacks against have advantage." },
  { name: 'Unconscious',   color: 'bg-[#303030] text-[#a8a8a8]',       info: "Incapacitated, can't move or speak. Drops held items, falls prone. Auto-fail Str/Dex saves. Attacks have advantage, melee hits are crits." },
]

export const getConditionColor = (name) =>
  CONDITIONS.find((c) => c.name === name)?.color ?? 'bg-slate-700/60 text-slate-300'

// ── Damage type colors ────────────────────────────────────────────────────────
export const DAMAGE_TYPE_COLORS = {
  fire:        '#FF6640',
  cold:        '#60AAEE',
  lightning:   '#DDDD44',
  thunder:     '#CC9944',
  acid:        '#66CC44',
  poison:      '#77BB66',
  necrotic:    '#88AA44',
  radiant:     '#EED878',
  force:       '#BB77EE',
  psychic:     '#AA66DD',
  bludgeoning: '#9090A8',
  piercing:    '#9090A8',
  slashing:    '#9090A8',
}

export function getDamageTypeColor(type) {
  if (!type) return null
  const key = type.toLowerCase().trim()
  return DAMAGE_TYPE_COLORS[key] ?? null
}
