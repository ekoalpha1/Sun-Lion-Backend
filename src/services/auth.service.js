import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import * as usersService from './users.service.js'

dotenv.config()
const JWT_SECRET = process.env.JWT_SECRET || 'change_jwt_secret'
const JWT_EXPIRES = process.env.JWT_EXPIRES || '15m'
const REFRESH_TOKEN_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || '7d'

export async function login(username, password) {
  // try users service first
  const user = await usersService.findByUsername(username)
  if (user) {
    const match = await bcrypt.compare(password, user.passwordHash)
    if (!match) throw new Error('invalid credentials')
    const payload = { sub: user.id, username: user.username, roles: user.roles || [], isAdmin: user.isAdmin }
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES })
    const refreshId = uuidv4()
    await usersService.addRefreshToken(user.id, refreshId)
    return { accessToken: token, refreshId, user }
  }

  // fallback to env admin
  const adminUser = process.env.ADMIN_USER
  if (adminUser && username === adminUser) {
    const adminPassHash = process.env.ADMIN_PASS_HASH
    if (adminPassHash) {
      const match = await bcrypt.compare(password, adminPassHash)
      if (!match) throw new Error('invalid credentials')
    } else {
      const adminPass = process.env.ADMIN_PASS
      if (!adminPass || password !== adminPass) throw new Error('invalid credentials')
    }
    const payload = { sub: username, username, roles: ['admin'], isAdmin: true }
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES })
    const refreshId = uuidv4()
    // no user record to attach to; return refreshId as ephemeral
    return { accessToken: token, refreshId, user: { id: username, username, isAdmin: true, roles: ['admin'] } }
  }

  throw new Error('invalid credentials')
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET)
}

export async function refreshAccessToken({ userId, refreshId }) {
  const ok = await usersService.validateRefreshToken(userId, refreshId)
  if (!ok) throw new Error('invalid_refresh')
  const user = await usersService.findById(userId)
  if (!user) throw new Error('user_not_found')
  const payload = { sub: user.id, username: user.username, roles: user.roles || [], isAdmin: user.isAdmin }
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES })
  return { accessToken: token }
}

export async function revokeRefreshToken(userId, refreshId) {
  await usersService.removeRefreshToken(userId, refreshId)
}

export default { login, verifyToken, refreshAccessToken, revokeRefreshToken }
