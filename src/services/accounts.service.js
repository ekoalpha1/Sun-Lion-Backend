import db from '../config/db.js'
import fs from 'fs'
import path from 'path'

const USE_PG = String(process.env.USE_PG || 'false').toLowerCase() === 'true'
const STORE = process.env.ADMIN_STORE_PATH || path.join(process.cwd(), 'data', 'admin_store.json')

function readStore() {
  if (!fs.existsSync(STORE)) return { accounts: [], transactions: [] }
  try { return JSON.parse(fs.readFileSync(STORE, 'utf8')) } catch (e) { return { accounts: [], transactions: [] } }
}

export async function getBalance(accountId) {
  if (USE_PG) {
    const r = await db.query('SELECT balance FROM accounts WHERE id = $1 OR account_number = $1 LIMIT 1', [accountId])
    if (!r.rowCount) return null
    return Number(r.rows[0].balance)
  }
  const store = readStore()
  const acct = (store.accounts || []).find(a => a.id === accountId || a.accountNumber === accountId)
  return acct ? Number(acct.balance || 0) : null
}

export async function recalculateBalance(accountId) {
  if (USE_PG) {
    const r = await db.query('SELECT SUM(amount) as sum FROM transactions WHERE account_id = $1', [accountId])
    const sum = r.rows[0] && r.rows[0].sum ? Number(r.rows[0].sum) : 0
    await db.query('UPDATE accounts SET balance = $1 WHERE id = $2', [sum, accountId])
    return sum
  }
  const store = readStore()
  const txs = (store.transactions || []).filter(t => t.accountId === accountId)
  const sum = txs.reduce((s, t) => s + Number(t.amount || 0), 0)
  const acct = (store.accounts || []).find(a => a.id === accountId)
  if (acct) { acct.balance = sum; fs.writeFileSync(STORE, JSON.stringify(store, null, 2)) }
  return sum
}

export default { getBalance, recalculateBalance }
