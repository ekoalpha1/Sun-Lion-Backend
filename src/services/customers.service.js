import fs from 'fs'
import path from 'path'
import { genId } from './_utils.js'
import db from '../config/db.js'

const USE_PG = String(process.env.USE_PG || 'false').toLowerCase() === 'true'
const STORE = process.env.ADMIN_STORE_PATH || path.join(process.cwd(), 'data', 'admin_store.json')

function ensure() {
  const dir = path.dirname(STORE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(STORE)) fs.writeFileSync(STORE, JSON.stringify({ customers: [], accounts: [], transactions: [] }, null, 2))
}

function read() {
  ensure()
  return JSON.parse(fs.readFileSync(STORE, 'utf8'))
}

function write(d) {
  fs.writeFileSync(STORE, JSON.stringify(d, null, 2))
}

export async function listCustomers() {
  if (USE_PG) {
    const r = await db.query('SELECT id, name, email, metadata, status, approved_by, approved_at, created_at FROM customers ORDER BY created_at DESC')
    return r.rows
  }
  const d = read()
  return d.customers || []
}

export async function getCustomer(id) {
  if (USE_PG) {
    const r = await db.query('SELECT id, name, email, metadata, status, approved_by, approved_at, created_at FROM customers WHERE id = $1 OR email = $1 LIMIT 1', [id])
    return r.rows[0]
  }
  const d = read()
  return (d.customers || []).find(c => c.id === id || c.email === id)
}

export async function registerCustomer({ name, email, metadata = {} }) {
  if (USE_PG) {
    // check exists
    const exists = await db.query('SELECT 1 FROM customers WHERE email = $1 LIMIT 1', [email])
    if (exists.rowCount) throw new Error('customer_exists')
    const id = genId('c')
    await db.query('INSERT INTO customers(id, name, email, metadata, status, created_at) VALUES($1,$2,$3,$4,$5,now())', [id, name, email, JSON.stringify(metadata), 'pending'])
    return { id, name, email, metadata, status: 'pending', createdAt: new Date().toISOString() }
  }
  const d = read()
  d.customers = d.customers || []
  const existing = d.customers.find(c => c.email === email)
  if (existing) throw new Error('customer_exists')
  const customer = { id: genId('c'), name, email, metadata, status: 'pending', createdAt: new Date().toISOString() }
  d.customers.push(customer)
  write(d)
  return customer
}

export async function approveCustomer(id, { approvedBy = 'admin' } = {}) {
  if (USE_PG) {
    const r = await db.query('UPDATE customers SET status = $1, approved_by = $2, approved_at = now() WHERE id = $3 OR email = $3 RETURNING id, name, email, metadata, status, approved_by, approved_at, created_at', ['active', approvedBy, id])
    if (!r.rowCount) throw new Error('customer_not_found')
    return r.rows[0]
  }
  const d = read()
  const cust = (d.customers || []).find(c => c.id === id || c.email === id)
  if (!cust) throw new Error('customer_not_found')
  cust.status = 'active'
  cust.approvedBy = approvedBy
  cust.approvedAt = new Date().toISOString()
  write(d)
  return cust
}

export default { listCustomers, getCustomer, registerCustomer, approveCustomer }
