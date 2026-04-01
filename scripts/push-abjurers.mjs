#!/usr/bin/env node
/**
 * Push 4 Abjurer statblocks to Vercel Blob Storage in a single write.
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env
const envPath = resolve(import.meta.dirname, '..', '..', '..', '..', '.env')
for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
  const match = line.match(/^\s*([^#=]+?)\s*=\s*(.+?)\s*$/)
  if (match) process.env[match[1]] = match[2]
}

const { put, list } = await import('@vercel/blob')

const BLOB_PATH = 'library.json'
const now = Date.now()

async function readBlob() {
  const { blobs } = await list({ prefix: BLOB_PATH })
  if (blobs.length === 0) return null
  const response = await fetch(blobs[0].url)
  return response.json()
}

const creatures = {
  "Creatures.Abjurer Null": {
    Id: "abjurer-null", Name: "Abjurer Null", Path: "", Source: "Conflux Creatures",
    Type: "Medium Humanoid",
    HP: { Value: 104, Notes: "(16d8 + 32)" },
    AC: { Value: 18, Notes: "(Multilayer Ward)" },
    InitiativeModifier: 3, InitiativeAdvantage: false,
    Speed: ["30 ft."],
    Abilities: { Str: 10, Dex: 16, Con: 15, Int: 17, Wis: 12, Cha: 12 },
    DamageVulnerabilities: [], DamageResistances: [], DamageImmunities: [], ConditionImmunities: [],
    Saves: [{ Name: "Dex", Modifier: 3 }, { Name: "Con", Modifier: 5 }, { Name: "Int", Modifier: 6 }, { Name: "Wis", Modifier: 4 }],
    Skills: [{ Name: "Arcana", Modifier: 6 }, { Name: "Perception", Modifier: 4 }],
    Senses: ["passive Perception 14"], Languages: ["Common"], Challenge: "5",
    Traits: [
      { Name: "Multilayer Ward", Content: "Whenever the abjurer is hit with an attack, its AC is reduced by 1, to a minimum of 13." },
      { Name: "Abjurative Purge (1/Day)", Content: "At the start of each of the abjurer's turns, it can end one spell or condition affecting it or a creature within 30 feet, or can restore its AC to 18." }
    ],
    Actions: [
      { Name: "Multiattack", Content: "The abjurer makes two attacks with its Nullsteel Staff or Threadbind." },
      { Name: "Nullsteel Staff", Content: "Melee Attack Roll: +6, reach 5 ft. Hit: 7 (1d8 + 3) Bludgeoning damage plus 5 (1d10) Force damage.\n\nThis attack ignores any magical bonus to the target's AC." },
      { Name: "Threadbind (Level 2 Spell)", Content: "Ranged Spell Attack: +6, range 60 ft. Hit: 16 (3d10) Force damage; on a hit or miss, the next attack against the target has Advantage.\n\nOn a Critical Hit, the target is Restrained until the end of the Abjurer's next turn (escape DC 14)." },
      { Name: "Sunder Arms (Recharge 5-6, Level 4 Spell)", Content: "One creature the abjurer can see within 30 feet must make a Strength Saving Throw: DC 14. Failure: 36 (8d8) Thunder damage and one weapon or spell focus carried by the creature flies 30 (1d6 x 10) feet in a direction of the abjurer's choice. Success: Half damage.\n\nNonmagical weapons affected by this spell shatter and are destroyed." }
    ],
    BonusActions: [],
    Reactions: [
      { Name: "Dilute (Level 2 Spell)", Content: "Trigger: A creature the abjurer can see within 60 feet casts a spell. Response: The creature must make a Constitution Saving Throw: DC 14. Failure: Any damage dealt by the spell is reduced by half." },
      { Name: "Syncopate (Level 2 Spell)", Content: "Trigger: A creature the abjurer can see within 60 feet begins to cast a spell. Response: Roll a d6. If the result is greater than the level of the triggering spell, the spell fails." }
    ],
    LegendaryActions: [], MythicActions: [],
    Description: "Clad in drab greys and exuding an aura of calm security, the warrior-mage nimbly hefts a white-bladed crook.",
    Player: "", Version: "3.15.3", ImageURL: "", ProficiencyBonus: 3, LastUpdateMs: now
  },

  "Creatures.Abjurer Wardwright": {
    Id: "abjurer-wardwright", Name: "Abjurer Wardwright", Path: "", Source: "Conflux Creatures",
    Type: "Medium Humanoid",
    HP: { Value: 120, Notes: "(16d8 + 48)" },
    AC: { Value: 18, Notes: "(Multilayer Ward)" },
    InitiativeModifier: 7, InitiativeAdvantage: false,
    Speed: ["30 ft."],
    Abilities: { Str: 10, Dex: 17, Con: 16, Int: 19, Wis: 12, Cha: 12 },
    DamageVulnerabilities: [], DamageResistances: [], DamageImmunities: [], ConditionImmunities: [],
    Saves: [{ Name: "Con", Modifier: 7 }, { Name: "Int", Modifier: 8 }, { Name: "Wis", Modifier: 5 }],
    Skills: [{ Name: "Arcana", Modifier: 8 }, { Name: "Perception", Modifier: 5 }, { Name: "Religion", Modifier: 8 }],
    Senses: ["passive Perception 15"], Languages: ["Common"], Challenge: "9",
    Traits: [
      { Name: "Ciphered Spells", Content: "The abjurer gains a +5 bonus to any saving throw made to resist its spells being countered or negated." },
      { Name: "Multilayer Ward", Content: "Whenever the abjurer is hit with an attack, its AC is reduced by 1, to a minimum of 13." },
      { Name: "Abjurative Purge (2/Day)", Content: "At the start of each of the abjurer's turns, it can end one spell or condition affecting it or a creature within 30 feet, or can restore its AC to 18." }
    ],
    Actions: [
      { Name: "Multiattack", Content: "The abjurer makes two attacks with its Threadbind, one of which it can replace with a use of its Thunderous Rejection, Adamant Stand, or Asylum Field." },
      { Name: "Threadbind (Level 3 Spell)", Content: "Ranged Spell Attack: +8, range 60 ft. Hit: 22 (4d10) Force damage; on a hit or miss, the next attack against the target has Advantage.\n\nOn a Critical Hit, the target is Restrained until the end of the Abjurer's next turn (escape DC 16)." },
      { Name: "Thunderous Rejection (Level 3 Spell)", Content: "Each creature of the abjurer's choice in a 15-foot Emanation from it must make a Constitution Saving Throw: DC 16. Failure: 16 (3d10) Thunder damage and the creature is pushed up to 20 feet away. Success: Half damage." },
      { Name: "Adamant Stand (Level 4 Spell, Concentration)", Content: "The abjurer bolsters up to two creatures within 30 feet against harm. Until the start of the abjurer's next turn, each creature has Resistance to all damage and regains its Reaction at the start of each turn." },
      { Name: "Asylum Field (Level 5 Spell, Concentration)", Content: "Protective glyphs swirl around the abjurer in a 15-foot Emanation.\n\nCreatures in the area have Advantage on saving throws against any effect that targets an area, and take no damage on a successful saving throw against such an effect." }
    ],
    BonusActions: [],
    Reactions: [
      { Name: "Syncopate (Level 2 Spell)", Content: "Trigger: A creature the abjurer can see within 60 feet begins to cast a spell. Response: Roll a d6. If the result is greater than the level of the triggering spell, the spell fails." },
      { Name: "Mirrorveil (Level 2 Spell)", Content: "Trigger: The abjurer is missed with a Spell Attack. Response: The attacker must make a new roll for the attack, targeting itself." },
      { Name: "Mage's Misstep (Level 3 Spell)", Content: "Trigger: A creature the abjurer can see within 60 feet teleports. Response: The creature must make an Intelligence Saving Throw: DC 16. Failure: 18 (4d8) Psychic damage and the creature instead teleports to an unoccupied space within 60 feet of the abjurer's choice." }
    ],
    LegendaryActions: [
      { Name: "Vigor on the Brink (Level 2 Spell)", Content: "One creature within 60 feet gains 10 Temporary Hit Points. If the creature has 0 Hit Points, it instead gains twice as many Temporary Hit Points and stabilizes." },
      { Name: "Beacon of Shelter (Level 2 Spell)", Content: "A protective glow spreads from the abjurer in a 30-foot Emanation. Each of the abjurer's allies in the area (other than it) gains a +2 bonus to its AC until the start of the abjurer's next turn." }
    ],
    MythicActions: [],
    Description: "Layers of shimmering wards enshroud the mage, pulsing with arcane glyphs as they add further depth of protection.",
    Player: "", Version: "3.15.3", ImageURL: "", ProficiencyBonus: 4, LastUpdateMs: now
  },

  "Creatures.Abjurer Antimage": {
    Id: "abjurer-antimage", Name: "Abjurer Antimage", Path: "", Source: "Conflux Creatures",
    Type: "Medium Humanoid",
    HP: { Value: 225, Notes: "(30d8 + 90)" },
    AC: { Value: 19, Notes: "(Multilayer Ward)" },
    InitiativeModifier: 9, InitiativeAdvantage: false,
    Speed: ["30 ft."],
    Abilities: { Str: 10, Dex: 18, Con: 17, Int: 21, Wis: 15, Cha: 12 },
    DamageVulnerabilities: [], DamageResistances: [], DamageImmunities: [], ConditionImmunities: [],
    Saves: [{ Name: "Con", Modifier: 8 }, { Name: "Int", Modifier: 10 }, { Name: "Wis", Modifier: 7 }],
    Skills: [{ Name: "Arcana", Modifier: 15 }, { Name: "Perception", Modifier: 7 }, { Name: "Religion", Modifier: 10 }],
    Senses: ["passive Perception 17"], Languages: ["Common"], Challenge: "14",
    Traits: [
      { Name: "Ciphered Spells", Content: "The abjurer gains a +5 bonus to any saving throw made to resist its spells being countered or negated." },
      { Name: "Multilayer Ward", Content: "Whenever the abjurer is hit with an attack, its AC is reduced by 1, to a minimum of 14." },
      { Name: "Abjurative Purge (3/Day)", Content: "At the start of each of the abjurer's turns, it can end one spell or condition affecting it or a creature within 30 feet, or can restore its AC to 19." }
    ],
    Actions: [
      { Name: "Multiattack", Content: "The abjurer makes two attacks, one of which it can replace with a use of its Thaumic Trammel or Adamant Stand." },
      { Name: "Threadbind (Level 4 Spell)", Content: "Ranged Spell Attack: +10, range 60 ft. Hit: 27 (5d10) Force damage; on a hit or miss, the next attack against the target has Advantage.\n\nOn a Critical Hit, the target is Restrained until the end of the Abjurer's next turn (escape DC 18)." },
      { Name: "Thaumic Trammel (Level 4 Spell)", Content: "The abjurer manifests the weight of magic, forcing one creature within 60 feet to make a Constitution Saving Throw: DC 18. Failure: The creature takes 15 (1d10 + 10) Force damage for each spell currently affecting it or that it is Concentrating on (including this one). Success: Half damage.\n\nA creature dealt 30 or more damage by this spell additionally falls Prone." },
      { Name: "Adamant Stand (Level 5 Spell, Concentration)", Content: "The abjurer bolsters up to three creatures within 30 feet against harm. Until the start of the abjurer's next turn, each creature has Resistance to all damage and regains its Reaction at the start of each turn." },
      { Name: "Expulsion Field (Level 6 Spell, Concentration)", Content: "A cloud of luminous threads surrounds the abjurer in a 15-foot Emanation, moving with it for 1 minute.\n\nWhenever a creature enters the area for the first time on a turn, the abjurer can force it to make a Strength Saving Throw: DC 18. Failure: 27 (6d8) Thunder damage and the creature is pushed up to 30 feet away from the abjurer. Success: Half damage." }
    ],
    BonusActions: [],
    Reactions: [
      { Name: "Counterspell (Level 3 Spell)", Content: "Trigger: A creature within 60 feet casts a spell. Response: The creature must make a Constitution Saving Throw: DC 18. Failure: The spell fails." },
      { Name: "Mage's Misstep (Level 3 Spell)", Content: "Trigger: A creature the abjurer can see within 60 feet teleports. Response: The creature must make an Intelligence Saving Throw: DC 18. Failure: 18 (4d8) Psychic damage and the creature instead teleports to an unoccupied space within 60 feet of the abjurer's choice." }
    ],
    LegendaryActions: [
      { Name: "Fleeting Shield (Level 3 Spell)", Content: "One creature within 60 feet gains 31 (2d10 + 20) Temporary Hit Points. If the creature would deal any damage while it has any of these Temporary Hit Points, it deals no damage and instead loses all remaining Temporary Hit Points." },
      { Name: "Shieldflare (Level 2 Spell)", Content: "One creature the abjurer can see within 60 feet loses any Temporary Hit Points it has, then the abjurer can deal Force Damage equal to the Temporary Hit Points lost in this way to a different target within 15 feet of it." },
      { Name: "Planar Refuge (Level 3 Spell, Concentration)", Content: "The abjurer banishes a willing creature other than itself within 60 feet to a harmless demiplane until the start of the creature's next turn.\n\nWhen the spell ends, the creature reappears in an unoccupied space of its choice within 30 feet of where it disappeared from." }
    ],
    MythicActions: [],
    Description: "A dull wrongness sits in the air around the mage, their wards sitting so heavy upon the weave as to block the flow of magic.",
    Player: "", Version: "3.15.3", ImageURL: "", ProficiencyBonus: 5, LastUpdateMs: now
  },

  "Creatures.Abjurer Keymaster": {
    Id: "abjurer-keymaster", Name: "Abjurer Keymaster", Path: "", Source: "Conflux Creatures",
    Type: "Medium Humanoid",
    HP: { Value: 306, Notes: "(36d8 + 144)" },
    AC: { Value: 20, Notes: "(Multilayer Ward)" },
    InitiativeModifier: 12, InitiativeAdvantage: false,
    Speed: ["30 ft."],
    Abilities: { Str: 10, Dex: 20, Con: 19, Int: 22, Wis: 15, Cha: 12 },
    DamageVulnerabilities: [], DamageResistances: [], DamageImmunities: [], ConditionImmunities: [],
    Saves: [{ Name: "Con", Modifier: 11 }, { Name: "Int", Modifier: 13 }, { Name: "Wis", Modifier: 9 }, { Name: "Cha", Modifier: 8 }],
    Skills: [{ Name: "Arcana", Modifier: 20 }, { Name: "Perception", Modifier: 9 }, { Name: "Religion", Modifier: 13 }],
    Senses: ["truesight 60 ft.", "passive Perception 19"], Languages: ["Common"], Challenge: "22",
    Traits: [
      { Name: "Ciphered Spells", Content: "The abjurer gains a +5 bonus to saving throws made to resist its spells being countered or negated." },
      { Name: "Multilayer Ward", Content: "Whenever the abjurer is hit with an attack, its AC is reduced by 1, to a minimum of 15." },
      { Name: "Abjurative Purge (5/Day)", Content: "At the start of each of the abjurer's turns, it can end one spell or condition affecting it or a creature within 30 feet, or can restore its AC to 19." }
    ],
    Actions: [
      { Name: "Multiattack", Content: "The abjurer makes three attacks, one of which it can replace with a use of its Thaumic Trammel, Expulsion Field, or Shroud of Mundus." },
      { Name: "Threadbind (Level 5 Spell)", Content: "Ranged Spell Attack: +13, range 60 ft. Hit: 33 (6d10) Force damage; on a hit or miss, the next attack against the target has Advantage.\n\nOn a Critical Hit, the target is Restrained until the end of the Abjurer's next turn (escape DC 21)." },
      { Name: "Thaumic Trammel (Level 5 Spell)", Content: "The abjurer manifests the weight of magic, forcing one creature within 60 feet to make a Constitution Saving Throw: DC 21. Failure: The creature takes 21 (2d10 + 10) Force damage for each spell currently affecting it or that it is Concentrating on (including this one). Success: Half damage.\n\nA creature dealt 30 or more damage by this spell additionally falls Prone." },
      { Name: "Expulsion Field (Level 6 Spell, Concentration)", Content: "A cloud of luminous threads surrounds the abjurer in a 15-foot Emanation, moving with it for 1 minute.\n\nWhenever a creature enters the area for the first time on a turn, the abjurer can force it to make a Strength Saving Throw: DC 21. Failure: 27 (6d8) Thunder damage and the creature is pushed up to 20 feet away from the abjurer." },
      { Name: "Shroud of Mundus (Recharge 5-6, Level 8 Spell)", Content: "One spellcaster the abjurer can see within 60 feet must make a Charisma Saving Throw: DC 21. Failure: 55 (10d10) Force damage and the target can't cast spells for 1 minute (Save Ends). Success: Half damage.\n\nWhenever a creature makes a saving throw against this effect, it can expend up to one Spell Slot, adding the expended slot's level to its result." },
      { Name: "Division Seal (1/Day, Level 9 Spell)", Content: "A magical barrier envelops a 30-foot Emanation within 500 feet; nothing can move or teleport in or out of the area.\n\nFor 1 minute, the barrier can be destroyed (AC 20, 200 HP, regains 50 Hit Points at the start of each of the abjurer's turns). After this, the barrier can be destroyed only by the Disintegrate spell or similar magic." }
    ],
    BonusActions: [],
    Reactions: [
      { Name: "Shield (Level 1 Spell, Abjuration)", Content: "Trigger: The abjurer is targeted with an attack. Response: The abjurer gains +5 to its AC until the start of its next turn." },
      { Name: "Counterspell (Level 3 Spell)", Content: "Trigger: A creature within 60 feet casts a spell. Response: The creature must make a Constitution Saving Throw: DC 21. Failure: The spell fails." },
      { Name: "Glyph of Exclusion (Recharges when Bloodied, Level 7 Spell)", Content: "Trigger: The abjurer would make a saving throw. Response: The abjurer disjoins the area in a 15-foot Emanation from it from reality; until the start of the abjurer's next turn, nothing outside that area can affect anything inside, and vice versa." }
    ],
    LegendaryActions: [
      { Name: "Fleeting Shield (Level 3 Spell)", Content: "One creature within 60 feet gains 31 (2d10 + 20) Temporary Hit Points. If the creature would deal any damage while it has any of these Temporary Hit Points, it deals no damage and instead loses all remaining Temporary Hit Points." },
      { Name: "Shieldflare (Level 2 Spell)", Content: "One creature the abjurer can see within 60 feet loses any Temporary Hit Points it has, then the abjurer can deal Force Damage equal to the Temporary Hit Points lost in this way to a different target within 15 feet of it." },
      { Name: "Planar Refuge (Level 3 Spell, Concentration)", Content: "The abjurer banishes a willing creature other than itself within 60 feet to a harmless demiplane until the start of the creature's next turn.\n\nWhen the spell ends, the creature reappears in an unoccupied space of its choice within 30 feet of where it disappeared from." }
    ],
    MythicActions: [],
    Description: "The master-exorcist mutters a rapid cycle of invocations, each evoking a sigil from their motley array of talismans.",
    Player: "", Version: "3.15.3", ImageURL: "", ProficiencyBonus: 7, LastUpdateMs: now
  }
}

// Read, merge, write
console.log('Reading current blob storage...')
const { blobs } = await list({ prefix: BLOB_PATH })
let existing = {}
if (blobs.length > 0) {
  const response = await fetch(blobs[0].url)
  existing = await response.json()
}
const existingCount = Object.keys(existing).filter(k => k.startsWith('Creatures.')).length
console.log(`Current blob has ${existingCount} creatures`)

const merged = { ...existing, ...creatures }
const mergedCount = Object.keys(merged).filter(k => k.startsWith('Creatures.')).length
console.log(`After merge: ${mergedCount} creatures (+${mergedCount - existingCount} new)`)

console.log('Writing to blob storage...')
await put(BLOB_PATH, JSON.stringify(merged), {
  access: 'public',
  addRandomSuffix: false,
  allowOverwrite: true,
})
console.log('Done! All 4 Abjurer statblocks pushed successfully.')
