import fs from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'

const STORE = process.env.USERS_STORE_PATH || path.join(process.cwd(), 'data', 'users.json')

function ensureStore() {
  const dir = path.dirname(STORE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(STORE)) fs.writeFileSync(STORE, JSON.stringify({ users: [] }, null, 2))
}

function readStore() {
  ensureStore()
  const raw = fs.readFileSync(STORE, 'utf8')
  return JSON.parse(raw)
}

function writeStore(data) {
  fs.writeFileSync(STORE, JSON.stringify(data, null, 2))
}

export async function createUser({ username, password, roles = [], isAdmin = false, permissions = [] }) {
  const data = readStore()
  if (data.users.find(u => u.username === username)) throw new Error('user exists')
  const hash = await bcrypt.hash(password, 10)
  const user = { id: 'u_' + Date.now(), username, passwordHash: hash, roles, isAdmin, permissions, refreshTokens: [] }
  data.users.push(user)
  writeStore(data)
  return user
}

export async function findByUsername(username) {
  const data = readStore()
  return data.users.find(u => u.username === username)
}

export async function findById(id) {
  const data = readStore()
  return data.users.find(u => u.id === id)
}

export async function addRefreshToken(userId, tokenId) {
  const data = readStore()
  const user = data.users.find(u => u.id === userId)
  if (!user) throw new Error('user not found')
  user.refreshTokens = user.refreshTokens || []
  user.refreshTokens.push({ id: tokenId, createdAt: new Date().toISOString() })
  writeStore(data)
}

export async function removeRefreshToken(userId, tokenId) {
  const data = readStore()
  const user = data.users.find(u => u.id === userId)
  if (!user) return
  user.refreshTokens = (user.refreshTokens || []).filter(t => t.id !== tokenId)
  writeStore(data)
}

export async function validateRefreshToken(userId, tokenId) {
  const data = readStore()
  const user = data.users.find(u => u.id === userId)
  if (!user) return false
  return (user.refreshTokens || []).some(t => t.id === tokenId)
}

export default { createUser, findByUsername, findById, addRefreshToken, removeRefreshToken, validateRefreshToken }
