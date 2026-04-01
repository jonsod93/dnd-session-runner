#!/usr/bin/env node
/**
 * Import Conflux Creatures from an Improved Initiative export
 * into Vercel Blob Storage in a single write operation.
 *
 * Usage:
 *   node scripts/import-conflux.mjs <path-to-export-json>
 *
 * Requires BLOB_READ_WRITE_TOKEN in .env (root of project).
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env manually (avoid dotenv dependency)
// Worktree lives under .claude/worktrees/<name>, so walk up to repo root
const envPath = resolve(import.meta.dirname, '..', '..', '..', '..', '.env')
for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
  const match = line.match(/^\s*([^#=]+?)\s*=\s*(.+?)\s*$/)
  if (match) process.env[match[1]] = match[2]
}

const { put, list } = await import('@vercel/blob')

const BLOB_PATH = 'library.json'

// ── Blob helpers (same as api/creatures.js) ─────────────────────────────────

async function readBlob() {
  const { blobs } = await list({ prefix: BLOB_PATH })
  if (blobs.length === 0) return null
  const response = await fetch(blobs[0].url)
  return response.json()
}

async function writeBlob(data) {
  await put(BLOB_PATH, JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
  })
}

// ── AC normalization ────────────────────────────────────────────────────────

function normalizeAC(ac) {
  if (ac == null) return { Value: 10 }
  if (typeof ac === 'number') return { Value: ac }
  if (typeof ac === 'object' && ac.Value != null) return ac
  return { Value: 10 }
}

// ── Main ────────────────────────────────────────────────────────────────────

const sourcePath = process.argv[2]
if (!sourcePath) {
  console.error('Usage: node scripts/import-conflux.mjs <path-to-export-json>')
  process.exit(1)
}

console.log('Reading source JSON...')
const sourceData = JSON.parse(readFileSync(sourcePath, 'utf-8'))

// Extract Conflux creatures
const conflux = {}
let acFixed = 0
for (const [key, val] of Object.entries(sourceData)) {
  if (!key.startsWith('Creatures.') || !val || typeof val !== 'object') continue
  if (val.Path !== 'Conflux Creatures') continue

  // Re-key to canonical Creatures.{Name}
  const canonicalKey = `Creatures.${val.Name}`

  // Normalize AC from number to object
  if (typeof val.AC === 'number') {
    val.AC = normalizeAC(val.AC)
    acFixed++
  }

  conflux[canonicalKey] = val
}

const confluxCount = Object.keys(conflux).length
console.log(`Found ${confluxCount} Conflux creatures (${acFixed} AC fields normalized)`)

if (confluxCount === 0) {
  console.error('No Conflux creatures found - aborting')
  process.exit(1)
}

// Show a few samples
const sampleKeys = Object.keys(conflux).slice(0, 3)
for (const k of sampleKeys) {
  const c = conflux[k]
  console.log(`  ${k}: AC=${JSON.stringify(c.AC)}, HP=${JSON.stringify(c.HP)}, Type=${c.Type}`)
}

// Read current blob
console.log('\nReading current blob storage...')
const existing = (await readBlob()) || {}
const existingCreatureCount = Object.keys(existing).filter(k => k.startsWith('Creatures.')).length
console.log(`Current blob has ${existingCreatureCount} creatures`)

// Merge: Conflux creatures added on top of existing data
const merged = { ...existing, ...conflux }
const mergedCreatureCount = Object.keys(merged).filter(k => k.startsWith('Creatures.')).length
const newCreatures = mergedCreatureCount - existingCreatureCount

console.log(`\nAfter merge: ${mergedCreatureCount} total creatures (+${newCreatures} net new)`)

// Confirm before writing
if (process.argv.includes('--dry-run')) {
  console.log('\n--dry-run flag set, skipping blob write')
  process.exit(0)
}

console.log('Writing merged data to blob storage...')
await writeBlob(merged)
console.log('Done! Blob storage updated successfully.')
