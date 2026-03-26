import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { username, password } = req.body || {}
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }

  const validUser = process.env.AUTH_USERNAME
  const validHash = process.env.AUTH_PASSWORD_HASH
  const jwtSecret = process.env.JWT_SECRET

  if (!validUser || !validHash || !jwtSecret) {
    console.error('[api/login] Missing AUTH_USERNAME, AUTH_PASSWORD_HASH, or JWT_SECRET env vars')
    return res.status(500).json({ error: 'Server auth not configured' })
  }

  if (username !== validUser || !bcrypt.compareSync(password, validHash)) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const secret = new TextEncoder().encode(jwtSecret)
  const token = await new SignJWT({ sub: username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)

  return res.status(200).json({ token })
}
