#!/usr/bin/env node
/**
 * Import Tome of Beasts 1 creatures from 5etools JSON format
 * into the project's improved-initiative format.
 *
 * Usage:
 *   node scripts/import-tob1.mjs "path/to/Kobold Press; Tome of Beasts.json"
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

// ── Size / Alignment maps ────────────────────────────────────────────────────

const SIZE_MAP = { T: 'Tiny', S: 'Small', M: 'Medium', L: 'Large', H: 'Huge', G: 'Gargantuan' }

const ALIGN_MAP = { L: 'Lawful', C: 'Chaotic', N: 'Neutral', G: 'Good', E: 'Evil' }

function formatAlignment(align) {
  if (!align?.length) return ''
  // Handle complex alignment arrays (e.g. objects with alignment sub-arrays)
  if (typeof align[0] === 'object') {
    return align.map(a => formatAlignment(a.alignment)).join(' or ')
  }
  // Special cases
  if (align.includes('U')) return 'Unaligned'
  if (align.includes('A')) return 'Any Alignment'
  // "NX" = "neutral on the law/chaos axis", "NY" = "neutral on the good/evil axis"
  const filtered = align.filter(a => !a.startsWith('N') || a === 'N')
  if (filtered.length === 1 && filtered[0] === 'N') return 'Neutral'
  return filtered.map(a => ALIGN_MAP[a] || a).join(' ')
}

function formatType(monster) {
  const size = SIZE_MAP[monster.size] || monster.size
  let type
  if (typeof monster.type === 'string') {
    type = monster.type.charAt(0).toUpperCase() + monster.type.slice(1)
  } else if (monster.type?.type) {
    type = monster.type.type.charAt(0).toUpperCase() + monster.type.type.slice(1)
    if (monster.type.tags?.length) {
      type += ` (${monster.type.tags.join(', ')})`
    }
  } else {
    type = 'Unknown'
  }
  const alignment = formatAlignment(monster.alignment)
  return alignment ? `${size} ${type}, ${alignment}` : `${size} ${type}`
}

// ── 5etools tag stripping ────────────────────────────────────────────────────

function stripTags(text) {
  if (typeof text !== 'string') return String(text ?? '')
  return text
    // {@atk mw} -> "Melee Weapon Attack:", {@atk rw} -> "Ranged Weapon Attack:", etc.
    .replace(/\{@atk mw\}/gi, 'Melee Weapon Attack:')
    .replace(/\{@atk rw\}/gi, 'Ranged Weapon Attack:')
    .replace(/\{@atk mw,rw\}/gi, 'Melee or Ranged Weapon Attack:')
    .replace(/\{@atk ms\}/gi, 'Melee Spell Attack:')
    .replace(/\{@atk rs\}/gi, 'Ranged Spell Attack:')
    // {@hit +N} -> "+N"
    .replace(/\{@hit ([^}]+)\}/g, '$1')
    // {@dc N} -> "DC N"
    .replace(/\{@dc ([^}]+)\}/g, 'DC $1')
    // {@damage NdN+N} -> "NdN+N"
    .replace(/\{@damage ([^}]+)\}/g, '$1')
    // {@dice NdN+N} -> "NdN+N"
    .replace(/\{@dice ([^}]+)\}/g, '$1')
    // {@spell name} -> "name"
    .replace(/\{@spell ([^}]+)\}/g, '$1')
    // {@condition name} -> "name"
    .replace(/\{@condition ([^}]+)\}/g, '$1')
    // {@skill name} -> "name"
    .replace(/\{@skill ([^}]+)\}/g, '$1')
    // {@item name|source|display} -> display or name
    .replace(/\{@item ([^|}]+)(?:\|[^|}]+)*\|([^}]+)\}/g, '$2')
    .replace(/\{@item ([^|}]+)[^}]*\}/g, '$1')
    // {@creature name|source|display} -> display or name
    .replace(/\{@creature ([^|}]+)(?:\|[^|}]+)*\|([^}]+)\}/g, '$2')
    .replace(/\{@creature ([^|}]+)[^}]*\}/g, '$1')
    // {@filter display|...|...} -> display
    .replace(/\{@filter ([^|}]+)[^}]*\}/g, '$1')
    // {@recharge N} -> "(Recharge N-6)"
    .replace(/\{@recharge (\d+)\}/g, '(Recharge $1-6)')
    .replace(/\{@recharge\}/g, '(Recharge 6)')
    // Catch-all for any remaining {@tag content} -> content
    .replace(/\{@\w+ ([^}]+)\}/g, '$1')
}

// ── Entries flattening ───────────────────────────────────────────────────────

function flattenEntries(entries) {
  if (!entries) return ''
  return entries.map(e => {
    if (typeof e === 'string') return stripTags(e)
    if (e.type === 'list' && e.items) {
      return e.items.map(item => {
        if (typeof item === 'string') return stripTags(item)
        // Named list items like { type: "item", name: "...", entry: "..." }
        if (item.type === 'item') {
          return `${stripTags(item.name)}. ${stripTags(item.entry || '')}`
        }
        if (item.entries) return flattenEntries(item.entries)
        return stripTags(JSON.stringify(item))
      }).join('\n')
    }
    if (e.type === 'entries' && e.entries) {
      const prefix = e.name ? `${stripTags(e.name)}. ` : ''
      return prefix + flattenEntries(e.entries)
    }
    if (e.entries) return flattenEntries(e.entries)
    if (e.entry) return stripTags(e.entry)
    return ''
  }).filter(Boolean).join('\n')
}

// ── Speed conversion ─────────────────────────────────────────────────────────

function convertSpeed(speed) {
  if (!speed) return []
  const result = []
  for (const [mode, val] of Object.entries(speed)) {
    if (mode === 'canHover') continue
    let num, cond = ''
    if (typeof val === 'object') {
      num = val.number
      cond = val.condition || ''
    } else {
      num = val
    }
    if (typeof num !== 'number') continue
    const str = mode === 'walk'
      ? `${num} ft.${cond}`
      : `${mode} ${num} ft.${cond}`
    result.push(str.trim())
  }
  return result
}

// ── Damage type flattening ───────────────────────────────────────────────────

function flattenDamageTypes(arr) {
  if (!arr) return []
  return arr.map(entry => {
    if (typeof entry === 'string') return entry
    // Complex entries like { resist: ["bludgeoning", ...], note: "from nonmagical weapons" }
    const types = entry.resist || entry.immune || entry.vulnerable || []
    const note = entry.note ? ` ${entry.note}` : ''
    return types.join(', ') + note
  }).filter(Boolean)
}

// ── Saves/Skills conversion ──────────────────────────────────────────────────

const ABILITY_SHORT = { str: 'Str', dex: 'Dex', con: 'Con', int: 'Int', wis: 'Wis', cha: 'Cha' }

function convertSaves(saves) {
  if (!saves) return []
  return Object.entries(saves).map(([key, val]) => ({
    Name: ABILITY_SHORT[key] || key.charAt(0).toUpperCase() + key.slice(1),
    Modifier: parseInt(val) || 0,
  }))
}

function convertSkills(skills) {
  if (!skills) return []
  return Object.entries(skills).map(([key, val]) => ({
    Name: key.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    Modifier: parseInt(val) || 0,
  }))
}

// ── Senses / Languages ──────────────────────────────────────────────────────

function convertSenses(senses, passive) {
  const result = []
  if (senses) {
    if (typeof senses === 'string') {
      result.push(...senses.split(',').map(s => s.trim()).filter(Boolean))
    } else if (Array.isArray(senses)) {
      result.push(...senses.map(s => stripTags(s)))
    }
  }
  if (passive != null) {
    result.push(`passive Perception ${passive}`)
  }
  return result
}

function convertLanguages(languages) {
  if (!languages) return []
  if (typeof languages === 'string') {
    return languages.split(',').map(s => s.trim()).filter(Boolean)
  }
  if (Array.isArray(languages)) return languages
  return []
}

// ── Spellcasting -> Trait ────────────────────────────────────────────────────

function convertSpellcasting(spellcasting) {
  if (!spellcasting?.length) return []
  return spellcasting.map(sc => {
    const parts = []
    if (sc.headerEntries) {
      parts.push(flattenEntries(sc.headerEntries))
    }
    if (sc.will) {
      parts.push(`At will: ${sc.will.map(s => stripTags(s)).join(', ')}`)
    }
    if (sc.daily) {
      // Keys like "3e" = 3/day each, "1" = 1/day, "1e" = 1/day each
      for (const [key, spells] of Object.entries(sc.daily)) {
        const count = key.replace(/e$/, '')
        const each = key.endsWith('e') ? ' each' : ''
        parts.push(`${count}/day${each}: ${spells.map(s => stripTags(s)).join(', ')}`)
      }
    }
    if (sc.spells) {
      for (const [level, data] of Object.entries(sc.spells)) {
        const spells = data.spells?.map(s => stripTags(s)).join(', ') || ''
        if (level === '0') {
          parts.push(`Cantrips (at will): ${spells}`)
        } else {
          const slots = data.slots ? ` (${data.slots} slots)` : ''
          parts.push(`${level}${ordSuffix(parseInt(level))} level${slots}: ${spells}`)
        }
      }
    }
    return {
      Name: sc.name || 'Spellcasting',
      Content: parts.join('\n'),
    }
  })
}

function ordSuffix(n) {
  if (n === 1) return 'st'
  if (n === 2) return 'nd'
  if (n === 3) return 'rd'
  return 'th'
}

// ── Action/Trait conversion ──────────────────────────────────────────────────

function convertAbilities(abilities) {
  if (!abilities?.length) return []
  return abilities.map(a => ({
    Name: stripTags(a.name || 'Unnamed'),
    Content: flattenEntries(a.entries),
  }))
}

// ── AC conversion ────────────────────────────────────────────────────────────

function convertAC(ac) {
  if (!ac?.length) return { Value: 10 }
  const first = ac[0]
  if (typeof first === 'number') return { Value: first }
  if (typeof first === 'object') {
    const result = { Value: first.ac }
    if (first.from?.length) {
      result.Notes = first.from.join(', ')
    }
    return result
  }
  return { Value: 10 }
}

// ── HP conversion ────────────────────────────────────────────────────────────

function convertHP(hp) {
  if (!hp) return { Value: 1, Notes: '' }
  // Add spaces around operators in formula for readability
  const formula = (hp.formula || '')
    .replace(/(\d)([+-])(\d)/g, '$1 $2 $3')
  return {
    Value: hp.average || 0,
    Notes: formula ? `(${formula})` : '',
  }
}

// ── Random ID generator ──────────────────────────────────────────────────────

function randomId() {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz'
  let id = ''
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

// ── Main conversion ──────────────────────────────────────────────────────────

function convertCreature(monster) {
  const dexMod = Math.floor((monster.dex - 10) / 2)

  const traits = [
    ...convertSpellcasting(monster.spellcasting),
    ...convertAbilities(monster.trait),
  ]

  return {
    Id: randomId(),
    Name: monster.name,
    Path: '',
    Source: 'Tome of Beasts',
    Type: formatType(monster),
    HP: convertHP(monster.hp),
    AC: convertAC(monster.ac),
    InitiativeModifier: dexMod,
    InitiativeAdvantage: false,
    Speed: convertSpeed(monster.speed),
    Abilities: {
      Str: monster.str,
      Dex: monster.dex,
      Con: monster.con,
      Int: monster.int,
      Wis: monster.wis,
      Cha: monster.cha,
    },
    DamageVulnerabilities: flattenDamageTypes(monster.vulnerable),
    DamageResistances: flattenDamageTypes(monster.resist),
    DamageImmunities: flattenDamageTypes(monster.immune),
    ConditionImmunities: monster.conditionImmune || [],
    Saves: convertSaves(monster.save),
    Skills: convertSkills(monster.skill),
    Senses: convertSenses(monster.senses, monster.passive),
    Languages: convertLanguages(monster.languages),
    ChallengeRating: String(monster.cr ?? ''),
    Traits: traits,
    Actions: convertAbilities(monster.action),
    BonusActions: convertAbilities(monster.bonus),
    Reactions: convertAbilities(monster.reaction),
    LegendaryActions: convertAbilities(monster.legendary),
    MythicActions: [],
    Description: '',
    Player: '',
    Version: '3.15.3',
    ImageURL: '',
    LastUpdateMs: Date.now(),
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

const tobPath = process.argv[2]
if (!tobPath) {
  console.error('Usage: node scripts/import-tob1.mjs <path-to-tob-json>')
  process.exit(1)
}

const libPath = resolve(import.meta.dirname, '..', 'src', 'data', 'improved-initiative.json')

console.log('Reading Tome of Beasts JSON...')
const tobData = JSON.parse(readFileSync(tobPath, 'utf-8'))
const monsters = tobData.monster
if (!monsters?.length) {
  console.error('No monsters found in source file')
  process.exit(1)
}
console.log(`Found ${monsters.length} creatures in source file`)

console.log('Reading existing library...')
const library = JSON.parse(readFileSync(libPath, 'utf-8'))
const existingCount = Object.keys(library).filter(k => k.startsWith('Creatures.')).length
console.log(`Existing library has ${existingCount} creatures`)

// Check for name collisions
const existingNames = new Set()
for (const [, v] of Object.entries(library)) {
  if (v?.Name) existingNames.add(v.Name)
}

let added = 0
let skipped = 0
const skippedNames = []

for (const monster of monsters) {
  if (existingNames.has(monster.name)) {
    skipped++
    skippedNames.push(monster.name)
    continue
  }

  const converted = convertCreature(monster)
  const key = `Creatures.${converted.Id}`
  library[key] = converted
  existingNames.add(converted.Name)
  added++
}

console.log(`\nConverted: ${added} creatures added`)
if (skipped > 0) {
  console.log(`Skipped: ${skipped} (name already exists)`)
  if (skippedNames.length <= 20) {
    console.log(`  Names: ${skippedNames.join(', ')}`)
  } else {
    console.log(`  First 20: ${skippedNames.slice(0, 20).join(', ')}...`)
  }
}

console.log('\nWriting updated library...')
writeFileSync(libPath, JSON.stringify(library, null, 2), 'utf-8')

const newTotal = Object.keys(library).filter(k => k.startsWith('Creatures.')).length
console.log(`Done! Library now has ${newTotal} creatures (was ${existingCount})`)
