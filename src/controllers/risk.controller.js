import * as riskService from '../services/risk.service.js'

export async function index(req, res) {
  try {
    if (riskService && typeof riskService.listFlags === 'function') {
      const rows = await riskService.listFlags()
      return res.json({ ok: true, flags: rows })
    }
    return res.json({ ok: true, flags: [] })
  } catch (err) {
    console.error('risk.index error', err)
    return res.status(500).json({ error: 'internal' })
  }
}

export async function creditCheck(req, res) {
  try {
    const { customerId } = req.params
    if (!customerId) return res.status(400).json({ error: 'customerId required' })
    const out = await riskService.creditMonitor(customerId)
    return res.json({ ok: true, credit: out })
  } catch (err) {
    console.error('risk.creditCheck error', err)
    return res.status(500).json({ error: 'internal' })
  }
}
