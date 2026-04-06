import { put, list } from '@vercel/blob'
import { verifyToken } from './lib/auth.js'

const BLOB_PATH = 'pcs.json'

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

async function checkAuth(req) {
  return verifyToken(req)
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  try {
    // GET: return PC list
    if (req.method === 'GET') {
      const data = await readBlob()
      return res.status(200).json(data || [])
    }

    // Auth gate for mutations
    if (!(await checkAuth(req))) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // POST: incremental upsert ({ pc }) or legacy full-list replace ({ pcs }).
    // Incremental is preferred so concurrent edits on different PCs from
    // different devices do not clobber each other.
    if (req.method === 'POST') {
      const { pc, pcs, originalName } = req.body || {}

      if (pc && typeof pc === 'object') {
        if (!pc.Name || typeof pc.Name !== 'string') {
          return res.status(400).json({ error: 'pc.Name is required' })
        }
        const current = (await readBlob()) || []
        if (!Array.isArray(current)) {
          return res.status(500).json({ error: 'PC blob is corrupted (not an array)' })
        }
        // Drop the original entry first if this is a rename, so the new Name
        // does not collide and the old one disappears in one write.
        const renaming = originalName && originalName !== pc.Name
        const next = renaming ? current.filter((p) => p.Name !== originalName) : current.slice()
        const idx = next.findIndex((p) => p.Name === pc.Name)
        if (idx >= 0) next[idx] = pc
        else next.push(pc)
        await writeBlob(next)
        return res.status(200).json({ ok: true })
      }

      if (Array.isArray(pcs)) {
        await writeBlob(pcs)
        return res.status(200).json({ ok: true })
      }

      return res.status(400).json({ error: 'pc object or pcs array is required' })
    }

    // DELETE: remove a single PC by Name.
    if (req.method === 'DELETE') {
      const { name } = req.body || {}
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'name is required' })
      }
      const current = (await readBlob()) || []
      if (!Array.isArray(current)) {
        return res.status(500).json({ error: 'PC blob is corrupted (not an array)' })
      }
      const next = current.filter((p) => p.Name !== name)
      await writeBlob(next)
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error(`[api/pcs] ${req.method} failed:`, err.message)
    return res.status(500).json({ error: err.message })
  }
}
