import { put, list } from '@vercel/blob'

const BLOB_PATH = 'pois.json'

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

import { verifyToken } from './lib/auth.js'

async function checkAuth(req) {
  return verifyToken(req)
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  try {
    // GET: return POI array
    if (req.method === 'GET') {
      const data = await readBlob()
      return res.status(200).json(data ?? [])
    }

    // Auth gate for mutations
    if (!(await checkAuth(req))) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // POST: save full POI array
    if (req.method === 'POST') {
      const { pois } = req.body || {}
      if (!Array.isArray(pois)) {
        return res.status(400).json({ error: 'pois must be an array' })
      }
      await writeBlob(pois)
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error(`[api/pois] ${req.method} failed:`, err.message)
    return res.status(500).json({ error: err.message })
  }
}
