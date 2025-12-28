import fs from 'fs'
import path from 'path'
import { genId } from './_utils.js'
import * as realtime from './realtimeEmitter.js'
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

export async function listTransactions({ accountId } = {}) {
  if (USE_PG) {
    if (accountId) {
      const r = await db.query('SELECT * FROM transactions WHERE account_id = $1 ORDER BY created_at DESC', [accountId])
      return r.rows
    }
    const r = await db.query('SELECT * FROM transactions ORDER BY created_at DESC')
    return r.rows
  }
  const d = read()
  let rows = d.transactions || []
  if (accountId) rows = rows.filter(t => t.accountId === accountId)
  return rows
}

async function findAccountByIdOrNumber(accountIdentifier) {
  if (USE_PG) {
    const r = await db.query('SELECT * FROM accounts WHERE id = $1 OR account_number = $1 LIMIT 1', [accountIdentifier])
    return r.rows[0]
  }
  const d = read()
  return (d.accounts || []).find(a => a.id === accountIdentifier || a.accountNumber === accountIdentifier)
}

export async function createTransaction({ accountId, userId, amount, description, type = 'credit', relatedAccountId = null }) {
  if (USE_PG) {
    // insert transaction and update balance atomically
    const client = await db.query('BEGIN')
    try {
      // get account
      const acctRes = await db.query('SELECT * FROM accounts WHERE id = $1 OR account_number = $1 LIMIT 1', [accountId])
      const acct = acctRes.rows[0]
      if (!acct) throw new Error('account_not_found')
      const newBalance = Number(acct.balance || 0) + Number(amount)
      await db.query('UPDATE accounts SET balance = $1 WHERE id = $2', [newBalance, acct.id])
      const txId = genId('tx')
      await db.query('INSERT INTO transactions(id, account_id, user_id, amount, type, description, related_account_id, created_at) VALUES($1,$2,$3,$4,$5,$6,$7,now())', [txId, acct.id, userId || acct.customer_id, amount, type, description || '', relatedAccountId])
      // commit via running a simple COMMIT
      await db.query('COMMIT')
      const tx = { id: txId, accountId: acct.id, userId: userId || acct.customer_id, amount, type, description, relatedAccountId, createdAt: new Date().toISOString() }
      try { await realtime.emitTransaction({ userId: tx.userId, transaction: tx }) } catch (e) {}
      try { await realtime.emitBalance({ accountId: acct.id, balance: newBalance }) } catch (e) {}
      return tx
    } catch (err) {
      try { await db.query('ROLLBACK') } catch (e) {}
      throw err
    }
  }

  const d = read()
  const acct = findAccountByIdOrNumber(accountId)
  if (!acct) throw new Error('account_not_found')
  d.transactions = d.transactions || []
  const tx = { id: genId('tx'), accountId: acct.id, userId: userId || acct.customerId, amount: Number(amount), type, description: description || '', relatedAccountId, createdAt: new Date().toISOString() }
  // update balance
  acct.balance = Number(acct.balance || 0) + Number(amount)
  d.transactions.push(tx)
  write(d)
  try { await realtime.emitTransaction({ userId: tx.userId, transaction: tx }) } catch (e) { /* non-blocking */ }
  try { await realtime.emitBalance({ accountId: acct.id, balance: acct.balance }) } catch (e) { }
  return tx
}

export async function transferBetweenAccounts({ fromAccountId, toAccountId, amount, description }) {
  if (USE_PG) {
    // use SQL transaction
    try {
      await db.query('BEGIN')
      const fromRes = await db.query('SELECT * FROM accounts WHERE id = $1 OR account_number = $1 LIMIT 1 FOR UPDATE', [fromAccountId])
      const toRes = await db.query('SELECT * FROM accounts WHERE id = $1 OR account_number = $1 LIMIT 1 FOR UPDATE', [toAccountId])
      const from = fromRes.rows[0]
      const to = toRes.rows[0]
      if (!from) throw new Error('from_account_not_found')
      if (!to) throw new Error('to_account_not_found')
      if (from.frozen) throw new Error('from_account_frozen')
      if (to.frozen) throw new Error('to_account_frozen')
      amount = Number(amount)
      if (isNaN(amount) || amount <= 0) throw new Error('invalid_amount')
      if (Number(from.balance || 0) < amount) throw new Error('insufficient_funds')

      const newFromBal = Number(from.balance) - amount
      const newToBal = Number(to.balance || 0) + amount
      await db.query('UPDATE accounts SET balance = $1 WHERE id = $2', [newFromBal, from.id])
      await db.query('UPDATE accounts SET balance = $1 WHERE id = $2', [newToBal, to.id])
      const txOutId = genId('tx')
      const txInId = genId('tx')
      await db.query('INSERT INTO transactions(id, account_id, user_id, amount, type, description, related_account_id, created_at) VALUES($1,$2,$3,$4,$5,$6,$7,now())', [txOutId, from.id, from.customer_id, -amount, 'debit', description || `transfer to ${to.id}`, to.id])
      await db.query('INSERT INTO transactions(id, account_id, user_id, amount, type, description, related_account_id, created_at) VALUES($1,$2,$3,$4,$5,$6,$7,now())', [txInId, to.id, to.customer_id, amount, 'credit', description || `transfer from ${from.id}`, from.id])
      await db.query('COMMIT')
      const debit = { id: txOutId, accountId: from.id, userId: from.customer_id, amount: -amount, type: 'debit', description: description || `transfer to ${to.id}`, relatedAccountId: to.id, createdAt: new Date().toISOString() }
      const credit = { id: txInId, accountId: to.id, userId: to.customer_id, amount: amount, type: 'credit', description: description || `transfer from ${from.id}`, relatedAccountId: from.id, createdAt: new Date().toISOString() }
      try { await realtime.emitTransaction({ userId: debit.userId, transaction: debit }) } catch (e) {}
      try { await realtime.emitBalance({ accountId: from.id, balance: newFromBal }) } catch (e) {}
      try { await realtime.emitTransaction({ userId: credit.userId, transaction: credit }) } catch (e) {}
      try { await realtime.emitBalance({ accountId: to.id, balance: newToBal }) } catch (e) {}
      return { debit, credit }
    } catch (err) {
      try { await db.query('ROLLBACK') } catch (e) {}
      throw err
    }
  }

  const d = read()
  const from = findAccountByIdOrNumber(fromAccountId)
  const to = findAccountByIdOrNumber(toAccountId)
  if (!from) throw new Error('from_account_not_found')
  if (!to) throw new Error('to_account_not_found')
  if (from.frozen) throw new Error('from_account_frozen')
  if (to.frozen) throw new Error('to_account_frozen')
  amount = Number(amount)
  if (isNaN(amount) || amount <= 0) throw new Error('invalid_amount')
  if (Number(from.balance || 0) < amount) throw new Error('insufficient_funds')

  // debit from
  from.balance = Number(from.balance) - amount
  const txOut = { id: genId('tx'), accountId: from.id, userId: from.customerId, amount: -amount, type: 'debit', description: description || `transfer to ${to.id}`, relatedAccountId: to.id, createdAt: new Date().toISOString() }
  // credit to
  to.balance = Number(to.balance || 0) + amount
  const txIn = { id: genId('tx'), accountId: to.id, userId: to.customerId, amount: amount, type: 'credit', description: description || `transfer from ${from.id}`, relatedAccountId: from.id, createdAt: new Date().toISOString() }

  d.transactions = d.transactions || []
  d.transactions.push(txOut, txIn)
  write(d)

  // emit events (best-effort)
  try { await realtime.emitTransaction({ userId: txOut.userId, transaction: txOut }) } catch (e) {}
  try { await realtime.emitBalance({ accountId: from.id, balance: from.balance }) } catch (e) {}
  try { await realtime.emitTransaction({ userId: txIn.userId, transaction: txIn }) } catch (e) {}
  try { await realtime.emitBalance({ accountId: to.id, balance: to.balance }) } catch (e) {}

  return { debit: txOut, credit: txIn }
}

export async function transferToUser({ fromAccountId, toUserId, amount, description }) {
  if (USE_PG) {
    const r = await db.query('SELECT id FROM accounts WHERE customer_id = $1 LIMIT 1', [toUserId])
    if (!r.rowCount) throw new Error('recipient_no_account')
    const recipientAccountId = r.rows[0].id
    return transferBetweenAccounts({ fromAccountId, toAccountId: recipientAccountId, amount, description })
  }
  const d = read()
  const from = findAccountByIdOrNumber(fromAccountId)
  if (!from) throw new Error('from_account_not_found')
  if (from.frozen) throw new Error('from_account_frozen')
  const recipientAccount = (d.accounts || []).find(a => a.customerId === toUserId)
  if (!recipientAccount) throw new Error('recipient_no_account')
  return transferBetweenAccounts({ fromAccountId: from.id, toAccountId: recipientAccount.id, amount, description })
}

export const DEPOSIT_LOCATIONS = [
  { id: 'walgreens', name: 'Walgreens' },
  { id: 'publix', name: 'Publix' },
  { id: 'walmart', name: 'Walmart' },
  { id: 'cvs', name: 'CVS' },
  { id: '7eleven', name: '7-Eleven' }
]

export async function directDeposit({ accountId, amount, source = 'external_bank', location = null }) {
  // credit the account
  return createTransaction({ accountId, amount, description: `direct_deposit:${source}${location ? ':'+location : ''}`, type: 'credit' })
}

export default { listTransactions, createTransaction, transferBetweenAccounts, transferToUser, directDeposit, DEPOSIT_LOCATIONS }
