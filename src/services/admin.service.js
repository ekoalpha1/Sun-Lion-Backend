import fs from 'fs'
import path from 'path'
import db from '../config/db.js'
import unitService from './unit.service.js'

const USE_PG = String(process.env.USE_PG || 'false').toLowerCase() === 'true'
const STORE = process.env.ADMIN_STORE_PATH || path.join(process.cwd(), 'data', 'admin_store.json')

function ensureStore() {
  const dir = path.dirname(STORE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(STORE)) {
    const initial = { customers: [], accounts: [], transactions: [] }
    fs.writeFileSync(STORE, JSON.stringify(initial, null, 2))
  }
}

function readStore() {
  ensureStore()
  const raw = fs.readFileSync(STORE, 'utf8')
  return JSON.parse(raw)
}

function writeStore(data) {
  fs.writeFileSync(STORE, JSON.stringify(data, null, 2))
}

export async function listCustomers() {
  if (USE_PG) {
    const r = await db.query('SELECT id, name, email, metadata, status, approved_by, approved_at, created_at FROM customers ORDER BY created_at DESC')
    return r.rows
  }
  const data = readStore()
  return data.customers || []
}

export async function listAccounts() {
  if (USE_PG) {
    const r = await db.query('SELECT id, account_number, customer_id, type, currency, balance, frozen, parent_account_id, created_at FROM accounts ORDER BY created_at DESC')
    return r.rows
  }
  const data = readStore()
  return data.accounts || []
}

export async function listTransactions({ accountId } = {}) {
  if (USE_PG) {
    if (accountId) {
      const r = await db.query('SELECT * FROM transactions WHERE account_id = $1 ORDER BY created_at DESC', [accountId])
      return r.rows
    }
    const r = await db.query('SELECT * FROM transactions ORDER BY created_at DESC')
    return r.rows
  }
  const data = readStore()
  let rows = data.transactions || []
  if (accountId) rows = rows.filter(r => r.accountId === accountId)
  return rows
}

export async function freezeAccount(accountId) {
  if (USE_PG) {
    const r = await db.query('UPDATE accounts SET frozen = true WHERE id = $1 OR account_number = $1 RETURNING id, account_number, customer_id, type, currency, balance, frozen, parent_account_id, created_at', [accountId])
    if (!r.rowCount) throw new Error('account_not_found')
    return r.rows[0]
  }
  const data = readStore()
  const acct = data.accounts.find(a => a.id === accountId)
  if (!acct) throw new Error('account_not_found')
  acct.frozen = true
  writeStore(data)
  return acct
}

export async function seedSampleData() {
  const now = new Date().toISOString()
  const data = {
    customers: [
      { id: 'c_1', name: 'Alice Smith', email: 'alice@example.com', createdAt: now },
      { id: 'c_2', name: 'Bob Jones', email: 'bob@example.com', createdAt: now },
      { id: 'c_3', name: 'Carol Lee', email: 'carol@example.com', createdAt: now }
    ],
    accounts: [
      { id: 'a_1', customerId: 'c_1', type: 'checking', balance: 1200.5, currency: 'USD', frozen: false, createdAt: now },
      { id: 'a_2', customerId: 'c_1', type: 'savings', balance: 5400.0, currency: 'USD', frozen: false, createdAt: now },
      { id: 'a_3', customerId: 'c_2', type: 'checking', balance: 75.25, currency: 'USD', frozen: false, createdAt: now },
      { id: 'a_4', customerId: 'c_3', type: 'checking', balance: 0.0, currency: 'USD', frozen: false, createdAt: now }
    ],
    transactions: [
      { id: 'tx_1', accountId: 'a_1', amount: -45.0, type: 'debit', description: 'Coffee', createdAt: now },
      { id: 'tx_2', accountId: 'a_1', amount: 150.0, type: 'credit', description: 'Payroll', createdAt: now },
      { id: 'tx_3', accountId: 'a_2', amount: 500.0, type: 'credit', description: 'Transfer', createdAt: now },
      { id: 'tx_4', accountId: 'a_3', amount: -20.0, type: 'debit', description: 'Groceries', createdAt: now },
      { id: 'tx_5', accountId: 'a_1', amount: -5.5, type: 'debit', description: 'Service Fee', createdAt: now }
    ]
  }
  writeStore(data)
  return data
}

function genId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 9000 + 1000)}`
}

function genAccountNumber() {
  // simple 10-digit account number
  return String(Math.floor(1000000000 + Math.random() * 9000000000))
}

export async function generateAccount({ customerId, type = 'checking', currency = 'USD', initialBalance = 0, parentAccountId = null }) {
  if (USE_PG) {
    const id = genId('a')
    const accountNumber = genAccountNumber()
    await db.query('INSERT INTO accounts(id, account_number, customer_id, type, currency, balance, frozen, parent_account_id, created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,now())', [id, accountNumber, customerId, type, currency, initialBalance || 0, false, parentAccountId || null])
    const r = await db.query('SELECT id, account_number, customer_id, type, currency, balance, frozen, parent_account_id, created_at FROM accounts WHERE id = $1', [id])
    return r.rows[0]
  }
  const data = readStore()
  const acct = {
    id: genId('a'),
    accountNumber: genAccountNumber(),
    customerId,
    type,
    currency,
    balance: Number(initialBalance) || 0,
    frozen: false,
    parentAccountId,
    createdAt: new Date().toISOString()
  }
  data.accounts = data.accounts || []
  data.accounts.push(acct)
  writeStore(data)
  return acct
}

export async function blockAccount(accountId, { reason = 'blocked by admin' } = {}) {
  if (USE_PG) {
    const r = await db.query('UPDATE accounts SET frozen = true WHERE id = $1 OR account_number = $1 RETURNING id, account_number, customer_id, type, currency, balance, frozen, parent_account_id, created_at', [accountId])
    if (!r.rowCount) throw new Error('account_not_found')
    try { await db.query('INSERT INTO risk_flags(id, customer_id, type, message, created_at) VALUES($1,$2,$3,$4,now())', [genId('rf'), r.rows[0].customer_id, 'account_block', reason]) } catch (e) {}
    return r.rows[0]
  }
  const data = readStore()
  const acct = data.accounts.find(a => a.id === accountId || a.accountNumber === accountId)
  if (!acct) throw new Error('account_not_found')
  acct.frozen = true
  acct.freezeReason = reason
  acct.frozenAt = new Date().toISOString()
  writeStore(data)
  return acct
}

export async function unblockAccount(accountId) {
  if (USE_PG) {
    const r = await db.query('UPDATE accounts SET frozen = false WHERE id = $1 OR account_number = $1 RETURNING id, account_number, customer_id, type, currency, balance, frozen, parent_account_id, created_at', [accountId])
    if (!r.rowCount) throw new Error('account_not_found')
    return r.rows[0]
  }
  const data = readStore()
  const acct = data.accounts.find(a => a.id === accountId || a.accountNumber === accountId)
  if (!acct) throw new Error('account_not_found')
  acct.frozen = false
  acct.freezeReason = null
  acct.unfrozenAt = new Date().toISOString()
  writeStore(data)
  return acct
}

export async function createSubAccount(parentAccountId, { label = 'sub', type = 'sub', currency = 'USD' } = {}) {
  if (USE_PG) {
    const p = await db.query('SELECT * FROM accounts WHERE id = $1 OR account_number = $1 LIMIT 1', [parentAccountId])
    if (!p.rowCount) throw new Error('parent_account_not_found')
    const parent = p.rows[0]
    return generateAccount({ customerId: parent.customer_id, type, currency, parentAccountId: parent.id })
  }
  const parent = (readStore().accounts || []).find(a => a.id === parentAccountId || a.accountNumber === parentAccountId)
  if (!parent) throw new Error('parent_account_not_found')
  return generateAccount({ customerId: parent.customerId, type, currency, parentAccountId: parent.id })
}

export async function issueDebitCard(accountId, { cardholderName = 'Customer', brand = 'VISA', color = 'blue', virtual = false } = {}) {
  if (USE_PG) {
    const acctRes = await db.query('SELECT id FROM accounts WHERE id = $1 OR account_number = $1 LIMIT 1', [accountId])
    const acct = acctRes.rows[0]
    if (!acct) throw new Error('account_not_found')
    const last4 = String(Math.floor(1000 + Math.random() * 9000))
    const id = genId('card')
    const virtualPan = virtual ? `vpan_${genId('v')}` : null
    await db.query('INSERT INTO cards(id, last4, brand, cardholder_name, color, virtual, virtual_pan, linked_account_id, status, issued_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,now())', [id, last4, brand, cardholderName, color, !!virtual, virtualPan, acct.id, 'active'])
    const r = await db.query('SELECT id, last4, brand, cardholder_name as cardholderName, color, virtual, virtual_pan as virtualPan, linked_account_id as linkedAccountId, status, issued_at as issuedAt FROM cards WHERE id = $1', [id])
    return r.rows[0]
  }
  const data = readStore()
  const acct = data.accounts.find(a => a.id === accountId || a.accountNumber === accountId)
  if (!acct) throw new Error('account_not_found')
  data.cards = data.cards || []
  const last4 = String(Math.floor(1000 + Math.random() * 9000))
  const card = {
    id: genId('card'),
    last4,
    brand,
    cardholderName,
    color,
    virtual: !!virtual,
    linkedAccountId: acct.id,
    status: 'active',
    issuedAt: new Date().toISOString()
  }
  if (!virtual) {
    card.pan = `**** **** **** ${last4}`
  } else {
    card.virtualPan = `vpan_${genId('v')}`
    card.display = `Virtual ${brand} •••• ${last4}`
  }
  data.cards.push(card)
  writeStore(data)
  return card
}

export async function verifyAppLicense(licenseKey) {
  if (USE_PG) {
    const r = await db.query('SELECT key, data, expires_at FROM licenses WHERE key = $1 LIMIT 1', [licenseKey])
    if (!r.rowCount) return { valid: false }
    const found = r.rows[0]
    const expired = found.expires_at && new Date(found.expires_at) < new Date()
    return { valid: !expired, license: found }
  }
  const licenseStore = process.env.LICENSE_STORE_PATH || path.join(process.cwd(), 'data', 'licenses.json')
  if (!fs.existsSync(licenseStore)) return { valid: false }
  const raw = fs.readFileSync(licenseStore, 'utf8')
  let licenses = []
  try { licenses = JSON.parse(raw) } catch (e) { licenses = [] }
  const found = licenses.find(l => l.key === licenseKey)
  if (!found) return { valid: false }
  const expired = found.expiresAt && new Date(found.expiresAt) < new Date()
  return { valid: !expired, license: found }
}

export async function createSupportTicket({ customerId, subject, message, createdBy = 'system' }) {
  if (USE_PG) {
    const id = genId('ticket')
    await db.query('INSERT INTO support_tickets(id, customer_id, subject, message, created_by, status, created_at) VALUES($1,$2,$3,$4,$5,$6,now())', [id, customerId, subject, message, createdBy, 'open'])
    const r = await db.query('SELECT id, customer_id as customerId, subject, message, created_by as createdBy, status, created_at as createdAt FROM support_tickets WHERE id = $1', [id])
    return r.rows[0]
  }
  const data = readStore()
  data.supportTickets = data.supportTickets || []
  const ticket = {
    id: genId('ticket'),
    customerId,
    subject,
    message,
    createdBy,
    status: 'open',
    createdAt: new Date().toISOString()
  }
  data.supportTickets.push(ticket)
  writeStore(data)
  return ticket
}

export async function troubleshootCustomer(customerId) {
  if (USE_PG) {
    const custR = await db.query('SELECT id, name, email, metadata, status, approved_by, approved_at, created_at FROM customers WHERE id = $1 LIMIT 1', [customerId])
    const accountsR = await db.query('SELECT id, account_number, customer_id, type, currency, balance, frozen, parent_account_id, created_at FROM accounts WHERE customer_id = $1', [customerId])
    const accountIds = accountsR.rows.map(r => r.id)
    let txs = []
    if (accountIds.length) {
      const q = `SELECT * FROM transactions WHERE account_id = ANY($1::text[]) ORDER BY created_at DESC LIMIT 20`
      const tR = await db.query(q, [accountIds])
      txs = tR.rows
    }
    return { customer: custR.rows[0], accounts: accountsR.rows, recentTransactions: txs }
  }
  const data = readStore()
  const customer = (data.customers || []).find(c => c.id === customerId)
  const accounts = (data.accounts || []).filter(a => a.customerId === customerId)
  const transactions = (data.transactions || []).filter(t => accounts.find(a => a.id === t.accountId))
  return { customer, accounts, recentTransactions: transactions.slice(-20) }
}

// Minimal stubs for third-party integrations. Replace with real SDK calls.
export async function unitCreateAccount(opts = {}) {
  if (process.env.UNIT_API_KEY) {
    // Build Unit customer and account payloads from opts
    const { customer = {}, accountType = 'checking', currency = 'USD' } = opts
    // Create or use existing customer
    let custResp
    if (customer.externalId) {
      custResp = { id: customer.externalId }
    } else {
      custResp = await unitService.createCustomer({ name: customer.name, email: customer.email, metadata: customer.metadata || {} })
    }
    // Create account under Unit
    const acctPayload = { customer_id: custResp.id || custResp.external_id || custResp.externalId, ledger_id: opts.ledgerId || 'default', product: accountType, currency }
    const acctResp = await unitService.createAccount(acctPayload)
    return { success: true, externalId: acctResp.id || acctResp.account_id || acctResp.externalId, unit: acctResp }
  }
  return { success: true, externalId: genId('unit_acc'), meta: opts }
}

export async function stripeCreateCardToken(cardInfo = {}) {
  // In production, use Stripe SDK to tokenize and create a card
  return { success: true, token: genId('tok'), last4: (cardInfo.number || '0000').slice(-4) }
}

export default {
  listCustomers,
  listAccounts,
  listTransactions,
  freezeAccount,
  seedSampleData,
  generateAccount,
  blockAccount,
  unblockAccount,
  createSubAccount,
  issueDebitCard,
  verifyAppLicense,
  createSupportTicket,
  troubleshootCustomer,
  unitCreateAccount,
  stripeCreateCardToken
}
