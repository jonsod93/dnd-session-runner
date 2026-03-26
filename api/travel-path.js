import { put, list } from '@vercel/blob'

const BLOB_PATH = 'travel-path.json'

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

function checkAuth(req) {
  const secret = process.env.API_SECRET
  if (!secret) return true
  const header = req.headers['authorization'] || ''
  return header === `Bearer ${secret}`
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  try {
    if (req.method === 'GET') {
      const data = await readBlob()
      return res.status(200).json(data ?? [])
    }

    if (!checkAuth(req)) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (req.method === 'POST') {
      const { waypoints } = req.body || {}
      if (!Array.isArray(waypoints)) {
        return res.status(400).json({ error: 'waypoints must be an array' })
      }
      await writeBlob(waypoints)
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error(`[api/travel-path] ${req.method} failed:`, err.message)
    return res.status(500).json({ error: err.message })
  }
}
