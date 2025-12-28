import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET || 'change_jwt_secret'

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || req.headers.Authorization
  if (!auth) return res.status(401).json({ error: 'unauthenticated' })
  const parts = String(auth).split(' ')
  const token = parts.length === 2 && parts[0].toLowerCase() === 'bearer' ? parts[1] : parts[0]
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = payload
    return next()
  } catch (err) {
    console.warn('JWT verify failed', err?.message || err)
    return res.status(401).json({ error: 'unauthenticated' })
  }
}
