import * as accountsService from '../services/accounts.service.js'
import * as transactionsService from '../services/transactions.service.js'
import { handlePaymentProcessed } from '../integrations/expressIntegration.js'

export async function createTransaction(req, res) {
  const { accountId } = req.params
  const { userId, amount, txId, type, metadata } = req.body
  if (!userId || typeof amount === 'undefined' || !txId) {
    return res.status(400).json({ error: 'userId, amount and txId are required' })
  }
  try {
    let tx
    if (transactionsService && typeof transactionsService.createTransaction === 'function') {
      tx = await transactionsService.createTransaction({ accountId, userId, amount, txId, type, metadata })
    } else {
      tx = { id: txId, accountId, userId, amount, type, metadata, createdAt: new Date().toISOString() }
    }

    // Emit without blocking
    try { handlePaymentProcessed({ userId, accountId, amount, txId }) } catch (e) { console.error('emit failed', e) }

    // Recalculate balance asynchronously if available
    try {
      if (accountsService && typeof accountsService.recalculateBalance === 'function') {
        accountsService.recalculateBalance(accountId).catch((err) => console.error('recalculateBalance failed', err))
      }
    } catch (e) {
      console.warn('accountsService not available', e)
    }

    return res.status(201).json({ transaction: tx })
  } catch (err) {
    console.error('createTransaction error', err)
    return res.status(500).json({ error: 'internal' })
  }
}

export async function getBalance(req, res) {
  const { accountId } = req.params
  try {
    if (accountsService && typeof accountsService.getBalance === 'function') {
      const balance = await accountsService.getBalance(accountId)
      return res.json({ accountId, balance })
    }
    return res.json({ accountId, balance: null })
  } catch (err) {
    console.error('getBalance error', err)
    return res.status(500).json({ error: 'internal' })
  }
}
