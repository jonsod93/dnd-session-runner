import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { put, list } from '@vercel/blob'

const BLOB_PATH = 'library.json'

// ── Blob helpers ────────────────────────────────────────────────────────────

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

function readBundledJson() {
  // Try several possible paths - Vercel's file layout varies
  const candidates = [
    join(process.cwd(), 'src', 'data', 'improved-initiative.json'),
    join(process.cwd(), '..', 'src', 'data', 'improved-initiative.json'),
    join(process.cwd(), 'data', 'improved-initiative.json'),
  ]
  for (const filePath of candidates) {
    if (existsSync(filePath)) {
      const raw = readFileSync(filePath, 'utf-8')
      return JSON.parse(raw)
    }
  }
  throw new Error(
    `Could not find improved-initiative.json. Tried: ${candidates.join(', ')}. ` +
    `cwd=${process.cwd()}`
  )
}

// ── Auth check for write operations ─────────────────────────────────────────

import { verifyToken } from './lib/auth.js'

async function checkAuth(req) {
  return verifyToken(req)
}

// ── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  try {
    // ── GET: return full library ──────────────────────────────────────────
    if (req.method === 'GET') {
      // ?reseed=true merges bundled JSON into blob (adds missing creatures)
      if (req.query.reseed === 'true') {
        if (!(await checkAuth(req))) {
          return res.status(401).json({ error: 'Unauthorized' })
        }
        console.log('[api/creatures] Reseed requested, merging bundled JSON into blob...')
        const bundled = readBundledJson()
        const existing = (await readBlob()) || {}
        // Merge: bundled entries fill in missing keys, existing entries are kept
        const merged = { ...bundled, ...existing }

        // Deduplicate: collapse entries with the same Name to canonical Creatures.${Name} key
        const nameToKeys = {}
        for (const key of Object.keys(merged)) {
          if (!key.startsWith('Creatures.')) continue
          const name = merged[key]?.Name
          if (!name) continue
          if (!nameToKeys[name]) nameToKeys[name] = []
          nameToKeys[name].push(key)
        }
        for (const [name, keys] of Object.entries(nameToKeys)) {
          if (keys.length <= 1) continue
          const canonicalKey = `Creatures.${name}`
          // Prefer the canonical key's data, fall back to last key's data
          const keepKey = keys.includes(canonicalKey) ? canonicalKey : keys[keys.length - 1]
          const keepData = merged[keepKey]
          for (const k of keys) delete merged[k]
          merged[canonicalKey] = keepData
        }

        await writeBlob(merged)
        const bundledCount = Object.keys(bundled).filter(k => k.startsWith('Creatures.')).length
        const existingCount = Object.keys(existing).filter(k => k.startsWith('Creatures.')).length
        const mergedCount = Object.keys(merged).filter(k => k.startsWith('Creatures.')).length
        console.log(`[api/creatures] Reseed complete: bundled=${bundledCount}, existing=${existingCount}, merged=${mergedCount}`)
        return res.status(200).json({ ok: true, bundled: bundledCount, existing: existingCount, merged: mergedCount })
      }

      let data = await readBlob()

      // Lazy migration: first request seeds the blob from the bundled JSON
      if (!data) {
        console.log('[api/creatures] No blob found, seeding from bundled JSON...')
        data = readBundledJson()
        await writeBlob(data)
        console.log('[api/creatures] Blob seeded successfully')
      }

      return res.status(200).json(data)
    }

    // ── Auth gate for mutations ──────────────────────────────────────────
    if (!(await checkAuth(req))) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // ── POST: add or update a creature ───────────────────────────────────
    if (req.method === 'POST') {
      const { statblock, key: oldKey } = req.body || {}
      if (!statblock?.Name) {
        return res.status(400).json({ error: 'statblock.Name is required' })
      }

      const data = (await readBlob()) || readBundledJson()
      const newKey = `Creatures.${statblock.Name}`

      // Remove old key if renaming
      if (oldKey && oldKey !== newKey) {
        delete data[oldKey]
      }

      data[newKey] = statblock
      await writeBlob(data)

      return res.status(200).json({ ok: true, key: newKey })
    }

    // ── DELETE: remove a creature ────────────────────────────────────────
    if (req.method === 'DELETE') {
      const { name, key: providedKey } = req.body || {}
      if (!name && !providedKey) {
        return res.status(400).json({ error: 'name or key is required' })
      }

      const data = (await readBlob()) || readBundledJson()

      // Use the provided key if available, otherwise fall back to name-based key
      let key = providedKey
      if (!key) {
        // Search by name across all creature keys
        key = Object.keys(data).find(
          (k) => k.startsWith('Creatures.') && data[k]?.Name === name
        ) || `Creatures.${name}`
      }

      if (!(key in data)) {
        return res.status(404).json({ error: `Creature "${name || key}" not found` })
      }

      delete data[key]
      await writeBlob(data)

      return res.status(200).json({ ok: true, deleted: key })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error(`[api/creatures] ${req.method} failed:`, err.message)
    return res.status(500).json({ error: err.message })
  }
}
