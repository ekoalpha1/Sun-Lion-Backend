import { emitTransaction, emitBalance } from '../services/realtimeEmitter.js'

// Safe wrapper to emit transaction events without blocking response flow
export async function handlePaymentProcessed({ userId, accountId, amount, txId }){
  try {
    // Emit transaction (fire-and-forget style)
    emitTransaction({ userId, transaction: { id: txId, amount, accountId, createdAt: new Date().toISOString() } })
      .catch((err) => console.error('emitTransaction failed', err?.message || err))

    // Optionally emit balance update later when known
    // emitBalance({ accountId, balance }).catch(err => console.error('emitBalance failed', err))
  } catch (err) {
    console.error('handlePaymentProcessed error', err?.message || err)
  }
}

/*
Example usage in an Express route (do not await emitter so webhook responds fast):

import express from 'express'
import { handlePaymentProcessed } from './integrations/expressIntegration.js'

const router = express.Router()

router.post('/payments/webhook', async (req, res) => {
  // process webhook payload, update DB, etc.
  const { userId, accountId, amount, txId } = req.body

  // Emit to realtime without delaying response
  handlePaymentProcessed({ userId, accountId, amount, txId })

  return res.status(200).send('ok')
})
*/
