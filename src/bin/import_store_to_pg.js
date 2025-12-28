#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import db from '../config/db.js'

async function run() {
  const storePath = process.env.ADMIN_STORE_PATH || path.join(process.cwd(), 'data', 'admin_store.json')
  if (!fs.existsSync(storePath)) {
    console.error('store file not found at', storePath)
    process.exit(1)
  }
  const raw = fs.readFileSync(storePath, 'utf8')
  let data = {}
  try { data = JSON.parse(raw) } catch (e) { console.error('invalid json', e); process.exit(1) }

  console.log('Importing customers...')
  for (const c of (data.customers || [])) {
    try {
      await db.query('INSERT INTO customers(id, name, email, metadata, status, created_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING', [c.id, c.name, c.email, JSON.stringify(c.metadata || {}), c.status || 'active', c.createdAt || new Date().toISOString()])
    } catch (err) { console.warn('customer import failed', c.id, err.message) }
  }

  console.log('Importing accounts...')
  for (const a of (data.accounts || [])) {
    try {
      await db.query('INSERT INTO accounts(id, account_number, customer_id, type, currency, balance, frozen, parent_account_id, created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING', [a.id, a.accountNumber || a.id, a.customerId || null, a.type || null, a.currency || 'USD', a.balance || 0, !!a.frozen, a.parentAccountId || null, a.createdAt || new Date().toISOString()])
    } catch (err) { console.warn('account import failed', a.id, err.message) }
  }

  console.log('Importing transactions...')
  for (const t of (data.transactions || [])) {
    try {
      await db.query('INSERT INTO transactions(id, account_id, user_id, amount, type, description, related_account_id, created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING', [t.id, t.accountId, t.userId || null, t.amount, t.type || null, t.description || null, t.relatedAccountId || null, t.createdAt || new Date().toISOString()])
    } catch (err) { console.warn('tx import failed', t.id, err.message) }
  }

  console.log('Importing cards...')
  for (const c of (data.cards || [])) {
    try {
      await db.query('INSERT INTO cards(id, last4, brand, cardholder_name, color, virtual, virtual_pan, linked_account_id, status, issued_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING', [c.id, c.last4, c.brand, c.cardholderName || c.cardholder_name, c.color || null, !!c.virtual, c.virtualPan || c.virtual_pan || null, c.linkedAccountId || c.linked_account_id || null, c.status || 'active', c.issuedAt || new Date().toISOString()])
    } catch (err) { console.warn('card import failed', c.id, err.message) }
  }

  console.log('Importing support tickets...')
  for (const s of (data.supportTickets || [])) {
    try {
      await db.query('INSERT INTO support_tickets(id, customer_id, subject, message, created_by, status, created_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING', [s.id, s.customerId, s.subject, s.message, s.createdBy || s.created_by || 'import', s.status || 'open', s.createdAt || new Date().toISOString()])
    } catch (err) { console.warn('ticket import failed', s.id, err.message) }
  }

  console.log('Importing licenses...')
  for (const l of (data.licenses || [])) {
    try {
      await db.query('INSERT INTO licenses(key, data, expires_at) VALUES($1,$2,$3) ON CONFLICT (key) DO NOTHING', [l.key, JSON.stringify(l), l.expiresAt || null])
    } catch (err) { console.warn('license import failed', l.key, err.message) }
  }

  console.log('Importing risk flags...')
  for (const r of (data.riskFlags || [])) {
    try {
      await db.query('INSERT INTO risk_flags(id, customer_id, type, message, created_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING', [r.id, r.customerId, r.type, r.message, r.createdAt || new Date().toISOString()])
    } catch (err) { console.warn('risk import failed', r.id, err.message) }
  }

  console.log('Import complete')
  process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
