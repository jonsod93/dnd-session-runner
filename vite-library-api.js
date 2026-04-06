/**
 * Vite dev-server plugin: exposes REST endpoints to read/write
 * the creature library JSON file on disk.
 *
 * Writes go to gitignored *.dev.json overlays so dev edits never mutate the
 * production-bundled baseline (which is the seed/fallback used by
 * api/creatures.js). Reads fall through to the bundled file the first time
 * a dev overlay does not exist yet.
 *
 * Endpoints:
 *   POST   /api/library/creature   { key?, statblock }   → add or update
 *   DELETE  /api/library/creature   { key }               → remove
 */
import fs from 'node:fs'
import path from 'node:path'

const BUNDLED_JSON_PATH = path.resolve('src/data/improved-initiative.json')
const BUNDLED_PCS_PATH = path.resolve('src/data/pcs.json')
const JSON_PATH = path.resolve('src/data/improved-initiative.dev.json')
const PCS_PATH = path.resolve('src/data/pcs.dev.json')

function readLibrary() {
  // Prefer the dev overlay if it exists; otherwise fall through to the
  // bundled baseline so the dev session starts from real data.
  const sourcePath = fs.existsSync(JSON_PATH) ? JSON_PATH : BUNDLED_JSON_PATH
  return JSON.parse(fs.readFileSync(sourcePath, 'utf-8'))
}

function writeLibrary(data) {
  fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

function readPCs() {
  if (fs.existsSync(PCS_PATH)) {
    return JSON.parse(fs.readFileSync(PCS_PATH, 'utf-8'))
  }
  if (fs.existsSync(BUNDLED_PCS_PATH)) {
    return JSON.parse(fs.readFileSync(BUNDLED_PCS_PATH, 'utf-8'))
  }
  return []
}

function creatureKey(name) {
  return `Creatures.${name}`
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

export default function libraryApiPlugin() {
  return {
    name: 'library-api',
    configureServer(server) {
      // ── PC endpoints ──────────────────────────────────────────────────
      server.middlewares.use('/api/library/pcs', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        try {
          if (req.method === 'GET') {
            return res.end(JSON.stringify(readPCs()))
          }
          if (req.method === 'POST') {
            const body = await bodyOf(req)
            // Incremental upsert: { pc: { Name, AC? } }
            if (body.pc && typeof body.pc === 'object') {
              const pc = body.pc
              if (!pc.Name?.trim()) {
                res.statusCode = 400
                return res.end(JSON.stringify({ error: 'pc.Name is required' }))
              }
              const list = readPCs()
              const idx = list.findIndex((p) => p.Name === pc.Name)
              if (idx >= 0) list[idx] = pc
              else list.push(pc)
              fs.writeFileSync(PCS_PATH, JSON.stringify(list, null, 2), 'utf-8')
              return res.end(JSON.stringify({ ok: true }))
            }
            // Legacy full-list replace: { pcs: [...] }
            if (Array.isArray(body.pcs)) {
              fs.writeFileSync(PCS_PATH, JSON.stringify(body.pcs, null, 2), 'utf-8')
              return res.end(JSON.stringify({ ok: true }))
            }
            res.statusCode = 400
            return res.end(JSON.stringify({ error: 'pc object or pcs array is required' }))
          }
          if (req.method === 'DELETE') {
            const { name } = await bodyOf(req)
            if (!name?.trim()) {
              res.statusCode = 400
              return res.end(JSON.stringify({ error: 'name is required' }))
            }
            const list = readPCs()
            const next = list.filter((p) => p.Name !== name)
            fs.writeFileSync(PCS_PATH, JSON.stringify(next, null, 2), 'utf-8')
            return res.end(JSON.stringify({ ok: true }))
          }
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
        } catch (err) {
          console.error('[library-api/pcs]', err)
          res.statusCode = 500
          res.end(JSON.stringify({ error: err.message }))
        }
      })

      // ── Creature endpoints ──────────────────────────────────────────────
      server.middlewares.use('/api/library/creature', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')

        try {
          if (req.method === 'POST') {
            const { key, statblock } = await bodyOf(req)
            if (!statblock?.Name?.trim()) {
              res.statusCode = 400
              return res.end(JSON.stringify({ error: 'Statblock must have a Name.' }))
            }

            const data = readLibrary()
            const targetKey = key || creatureKey(statblock.Name)

            // If renaming (key provided but name changed), remove old key
            if (key && key !== creatureKey(statblock.Name)) {
              delete data[key]
            }

            data[creatureKey(statblock.Name)] = statblock
            writeLibrary(data)

            return res.end(JSON.stringify({ ok: true, key: creatureKey(statblock.Name) }))
          }

          if (req.method === 'DELETE') {
            const { key, name } = await bodyOf(req)
            const targetKey = key || (name ? creatureKey(name) : null)
            if (!targetKey) {
              res.statusCode = 400
              return res.end(JSON.stringify({ error: 'Must provide key or name.' }))
            }

            const data = readLibrary()
            if (!(targetKey in data)) {
              res.statusCode = 404
              return res.end(JSON.stringify({ error: `Key "${targetKey}" not found.` }))
            }

            delete data[targetKey]
            writeLibrary(data)

            return res.end(JSON.stringify({ ok: true }))
          }

          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
        } catch (err) {
          console.error('[library-api]', err)
          res.statusCode = 500
          res.end(JSON.stringify({ error: err.message }))
        }
      })
    },
  }
}
