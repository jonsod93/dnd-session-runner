/**
 * Vite dev-server plugin: exposes REST endpoints to read/write
 * the travel path waypoints JSON file on disk.
 *
 * Endpoints:
 *   GET    /api/travel-path               -> return waypoints array
 *   POST   /api/travel-path   { waypoints }  -> save full waypoints array
 */
import fs from 'node:fs'
import path from 'node:path'

const JSON_PATH = path.resolve('src/data/travel-path.json')

function readWaypoints() {
  if (!fs.existsSync(JSON_PATH)) return []
  return JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'))
}

function writeWaypoints(data) {
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

export default function travelPathApiPlugin() {
  return {
    name: 'travel-path-api',
    configureServer(server) {
      server.middlewares.use('/api/travel-path', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')

        try {
          if (req.method === 'GET') {
            return res.end(JSON.stringify(readWaypoints()))
          }

          if (req.method === 'POST') {
            const { waypoints } = await bodyOf(req)
            if (!Array.isArray(waypoints)) {
              res.statusCode = 400
              return res.end(JSON.stringify({ error: 'waypoints must be an array' }))
            }
            writeWaypoints(waypoints)
            return res.end(JSON.stringify({ ok: true }))
          }

          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
        } catch (err) {
          console.error('[travel-path-api]', err)
          res.statusCode = 500
          res.end(JSON.stringify({ error: err.message }))
        }
      })
    },
  }
}
