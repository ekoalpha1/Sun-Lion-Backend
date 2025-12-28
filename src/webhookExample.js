import express from 'express'
import bodyParser from 'body-parser'
import dotenv from 'dotenv'
import { emitTransaction, emitBalance } from './services/realtimeEmitter.js'
import { handlePaymentProcessed } from './integrations/expressIntegration.js'

dotenv.config()
const app = express()
app.use(bodyParser.json())

// Example: call after processing a payment webhook
app.post('/webhook/payment', async (req, res) => {
  try {
    const { userId, accountId, amount, txId } = req.body
    // Your real processing logic goes here (db writes, validations)

    // Emit transaction event to realtime server (non-blocking)
    // Use the integration helper which performs fire-and-forget emission
    handlePaymentProcessed({ userId, accountId, amount, txId })

    // Optionally emit account balance update (non-blocking)
    // emitBalance({ accountId, balance: 12345 }).catch(err => console.error('emitBalance failed', err))

    res.json({ ok: true })
  } catch (err) {
    console.error('webhook error', err?.message || err)
    res.status(500).json({ error: 'internal' })
  }
})

const PORT = process.env.PORT || 5001
app.listen(PORT, () => console.log(`Webhook example listening ${PORT}`))
