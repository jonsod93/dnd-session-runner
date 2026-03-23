/**
 * Vite dev-server plugin: exposes REST endpoints to read/write
 * the creature library JSON file on disk.
 *
 * Endpoints:
 *   POST   /api/library/creature   { key?, statblock }   → add or update
 *   DELETE  /api/library/creature   { key }               → remove
 */
import fs from 'node:fs'
import path from 'node:path'

const JSON_PATH = path.resolve('src/data/improved-initiative.json')

function readLibrary() {
  return JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'))
}

function writeLibrary(data) {
  fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2), 'utf-8')
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
