import fs from 'fs'
import path from 'path'
import { genId } from './_utils.js'

const STORE = process.env.ADMIN_STORE_PATH || path.join(process.cwd(), 'data', 'admin_store.json')

function ensure() {
  const dir = path.dirname(STORE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(STORE)) fs.writeFileSync(STORE, JSON.stringify({ customers: [], accounts: [], transactions: [], riskFlags: [] }, null, 2))
}

function read() {
  ensure()
  return JSON.parse(fs.readFileSync(STORE, 'utf8'))
}

function write(d) {
  fs.writeFileSync(STORE, JSON.stringify(d, null, 2))
}

export async function listFlags() {
  const d = read()
  return d.riskFlags || []
}

export async function creditMonitor(customerId) {
  // stub: return a mock credit score and alerts
  const score = 600 + Math.floor(Math.random() * 200) // 600-799
  const alerts = []
  if (score < 650) alerts.push({ type: 'low_score', message: 'Credit score below 650' })
  return { customerId, score, alerts, checkedAt: new Date().toISOString() }
}

export default { listFlags, creditMonitor }
