import { handlePaymentProcessed } from '../integrations/expressIntegration.js'

export async function payment(req, res) {
  try {
    const { userId, accountId, amount, txId } = req.body
    // process business logic (DB writes, etc.) here in real app
    // emit asynchronously
    try { handlePaymentProcessed({ userId, accountId, amount, txId }) } catch (e) { console.error('emit error', e) }
    return res.json({ ok: true })
  } catch (err) {
    console.error('webhooks.payment error', err)
    return res.status(500).json({ error: 'internal' })
  }
}
