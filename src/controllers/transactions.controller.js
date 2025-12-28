import * as transactionsService from '../services/transactions.service.js'

export async function create(req, res) {
  try {
    const { accountId, userId, amount, txId } = req.body
    let tx
    if (transactionsService && typeof transactionsService.createTransaction === 'function') {
      tx = await transactionsService.createTransaction({ accountId, userId, amount, txId })
    } else {
      tx = { id: txId || 'tx_' + Date.now(), accountId, userId, amount, createdAt: new Date().toISOString() }
    }
    return res.status(201).json({ ok: true, transaction: tx })
  } catch (err) {
    console.error('transactions.create error', err)
    return res.status(500).json({ error: 'internal' })
  }
}

export async function list(req, res) {
  try {
    const { accountId } = req.query
    if (transactionsService && typeof transactionsService.listTransactions === 'function') {
      const rows = await transactionsService.listTransactions({ accountId })
      return res.json({ ok: true, transactions: rows })
    }
    return res.json({ ok: true, transactions: [] })
  } catch (err) {
    console.error('transactions.list error', err)
    return res.status(500).json({ error: 'internal' })
  }
}

export async function transfer(req, res) {
  try {
    const { fromAccountId, toAccountId, amount, description } = req.body
    if (!fromAccountId || !toAccountId || !amount) return res.status(400).json({ error: 'fromAccountId, toAccountId and amount required' })
    const out = await transactionsService.transferBetweenAccounts({ fromAccountId, toAccountId, amount, description })
    return res.json({ ok: true, result: out })
  } catch (err) {
    console.error('transactions.transfer error', err)
    const m = err.message || ''
    if (m === 'insufficient_funds') return res.status(400).json({ error: 'insufficient_funds' })
    if (m === 'from_account_not_found' || m === 'to_account_not_found') return res.status(404).json({ error: m })
    if (m === 'from_account_frozen' || m === 'to_account_frozen') return res.status(403).json({ error: m })
    return res.status(500).json({ error: 'internal' })
  }
}

export async function transferToUser(req, res) {
  try {
    const { fromAccountId, toUserId, amount, description } = req.body
    if (!fromAccountId || !toUserId || !amount) return res.status(400).json({ error: 'fromAccountId, toUserId and amount required' })
    const out = await transactionsService.transferToUser({ fromAccountId, toUserId, amount, description })
    return res.json({ ok: true, result: out })
  } catch (err) {
    console.error('transactions.transferToUser error', err)
    const m = err.message || ''
    if (m === 'insufficient_funds') return res.status(400).json({ error: 'insufficient_funds' })
    if (m === 'from_account_not_found' || m === 'recipient_no_account') return res.status(404).json({ error: m })
    return res.status(500).json({ error: 'internal' })
  }
}

export async function directDeposit(req, res) {
  try {
    const { accountId, amount, source, location } = req.body
    if (!accountId || !amount) return res.status(400).json({ error: 'accountId and amount required' })
    const tx = await transactionsService.directDeposit({ accountId, amount, source, location })
    return res.json({ ok: true, transaction: tx })
  } catch (err) {
    console.error('transactions.directDeposit error', err)
    if (err.message === 'account_not_found') return res.status(404).json({ error: 'account_not_found' })
    return res.status(500).json({ error: 'internal' })
  }
}

export async function depositLocations(req, res) {
  try {
    return res.json({ ok: true, locations: transactionsService.DEPOSIT_LOCATIONS })
  } catch (err) {
    console.error('transactions.depositLocations error', err)
    return res.status(500).json({ error: 'internal' })
  }
}
