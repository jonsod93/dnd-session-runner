import { jwtVerify } from 'jose'

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET)

export async function verifyToken(req) {
  const header = req.headers['authorization'] || ''
  if (!header.startsWith('Bearer ')) return false
  try {
    await jwtVerify(header.slice(7), secret())
    return true
  } catch {
    return false
  }
}
