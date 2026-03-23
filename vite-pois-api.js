/**
 * Vite dev-server plugin: exposes REST endpoints to read/write
 * the POI list JSON file on disk.
 *
 * Endpoints:
 *   GET    /api/pois           → return POI array
 *   POST   /api/pois   { pois }  → save full POI array
 */
import fs from 'node:fs'
import path from 'node:path'

const JSON_PATH = path.resolve('src/data/pois.json')

function readPOIs() {
  if (!fs.existsSync(JSON_PATH)) return []
  return JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'))
}

function writePOIs(data) {
  fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

function bodyOf(req) {
  return new Promise((resolve, reject) => {
    let buf = ''
    req.on('data', (chunk) => (buf += chunk))
    req.on('end', () => {
      try { resolve(JSON.parse(buf)) } catch (e) { reject(e) }
    })
  })
}

export default function poisApiPlugin() {
  return {
    name: 'pois-api',
    configureServer(server) {
      server.middlewares.use('/api/pois', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')

        try {
          if (req.method === 'GET') {
            return res.end(JSON.stringify(readPOIs()))
          }

          if (req.method === 'POST') {
            const { pois } = await bodyOf(req)
            if (!Array.isArray(pois)) {
              res.statusCode = 400
              return res.end(JSON.stringify({ error: 'pois must be an array' }))
            }
            writePOIs(pois)
            return res.end(JSON.stringify({ ok: true }))
          }

          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
        } catch (err) {
          console.error('[pois-api]', err)
          res.statusCode = 500
          res.end(JSON.stringify({ error: err.message }))
        }
      })
    },
  }
}
