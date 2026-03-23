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

function checkAuth(req) {
  const secret = process.env.API_SECRET
  if (!secret) return true // no secret configured = skip auth
  const header = req.headers['authorization'] || ''
  return header === `Bearer ${secret}`
}

// ── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  try {
    // ── GET: return full library ──────────────────────────────────────────
    if (req.method === 'GET') {
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
    if (!checkAuth(req)) {
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
      const { name } = req.body || {}
      if (!name) {
        return res.status(400).json({ error: 'name is required' })
      }

      const data = (await readBlob()) || readBundledJson()
      const key = `Creatures.${name}`

      if (!(key in data)) {
        return res.status(404).json({ error: `Creature "${name}" not found` })
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
