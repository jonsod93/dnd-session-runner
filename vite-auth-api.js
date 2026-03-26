/**
 * Vite dev-server plugin: handles POST /api/login for local development.
 *
 * In dev mode, accepts any credentials (no bcrypt/env vars needed)
 * and returns a signed JWT so the full auth flow works locally.
 */
import { SignJWT } from 'jose'

const DEV_JWT_SECRET = new TextEncoder().encode('dev-secret-not-for-production')

function bodyOf(req) {
  return new Promise((resolve, reject) => {
    let buf = ''
    req.on('data', (chunk) => (buf += chunk))
    req.on('end', () => {
      try { resolve(JSON.parse(buf)) } catch (e) { reject(e) }
    })
  })
}

export default function authApiPlugin() {
  return {
    name: 'auth-api',
    configureServer(server) {
      server.middlewares.use('/api/login', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')

        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end(JSON.stringify({ error: 'Method not allowed' }))
        }

        try {
          const { username, password } = await bodyOf(req)
          if (!username || !password) {
            res.statusCode = 400
            return res.end(JSON.stringify({ error: 'Username and password are required' }))
          }

          // In dev mode, accept any non-empty credentials
          const token = await new SignJWT({ sub: username })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('7d')
            .sign(DEV_JWT_SECRET)

          res.end(JSON.stringify({ token }))
        } catch (err) {
          console.error('[auth-api]', err)
          res.statusCode = 500
          res.end(JSON.stringify({ error: err.message }))
        }
      })
    },
  }
}
