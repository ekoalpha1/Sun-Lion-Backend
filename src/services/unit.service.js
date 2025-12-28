import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const UNIT_API_KEY = process.env.UNIT_API_KEY || process.env.UNIT_KEY
const UNIT_BASE = process.env.UNIT_BASE_URL || 'https://api.withunit.com'

if (!UNIT_API_KEY) {
  // Not throwing here; allow the application to start without Unit configured.
  console.warn('UNIT_API_KEY not set — Unit integration disabled')
}

const client = axios.create({
  baseURL: UNIT_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    ...(UNIT_API_KEY ? { Authorization: `Bearer ${UNIT_API_KEY}` } : {})
  }
})

async function request(method, path, { data, params, headers, retries = 2, idempotencyKey } = {}) {
  if (!UNIT_API_KEY) throw new Error('UNIT_API_KEY not set')
  const opts = { method, url: path, data, params, headers: { ...(headers || {}) } }
  if (idempotencyKey) opts.headers['Idempotency-Key'] = idempotencyKey

  let attempt = 0
  while (true) {
    try {
      const res = await client.request(opts)
      return res.data
    } catch (err) {
      attempt += 1
      const status = err?.response?.status
      const body = err?.response?.data
      // Do not retry on 4xx except 429
      if (attempt > retries || (status && status >= 400 && status < 500 && status !== 429)) {
        const e = new Error('unit_api_error')
        e.status = status
        e.body = body
        throw e
      }
      // backoff
      const delay = 200 * Math.pow(2, attempt)
      await new Promise(r => setTimeout(r, delay))
    }
  }
}

export async function createCustomer({ name, email, phone, metadata = {} } = {}) {
  const payload = { name, email, phone, metadata }
  const data = await request('post', '/v1/customers', { data: payload, retries: 3 })
  return { success: true, data }
}

export async function createDepositAccount({ customerId, product = 'deposit_account', currency = 'USD', ledgerId = null, metadata = {} } = {}) {
  if (!customerId) throw new Error('customerId_required')
  const payload = { customer_id: customerId, product, currency, metadata }
  if (ledgerId) payload.ledger_id = ledgerId
  const data = await request('post', '/v1/accounts', { data: payload, retries: 3 })
  return { success: true, data }
}

export async function issueCard({ accountId, cardholderName, brand = 'VISA', type = 'virtual', metadata = {} } = {}) {
  if (!accountId) throw new Error('accountId_required')
  const payload = { account_id: accountId, cardholder_name: cardholderName, brand, type, metadata }
  const data = await request('post', '/v1/cards', { data: payload, retries: 2 })
  return { success: true, data }
}

export async function createACH({ fromAccountId, toAccountId, amount, currency = 'USD', description = '', idempotencyKey = null } = {}) {
  if (!fromAccountId || !toAccountId || !amount) throw new Error('from_to_amount_required')
  const payload = { from_account_id: fromAccountId, to_account_id: toAccountId, amount, currency, description }
  const data = await request('post', '/v1/transfers', { data: payload, retries: 2, idempotencyKey })
  return { success: true, data }
}

export async function getTransactions({ accountId, startDate, endDate, limit = 100 } = {}) {
  const params = { account_id: accountId, limit }
  if (startDate) params.start_time = startDate
  if (endDate) params.end_time = endDate
  const data = await request('get', '/v1/transactions', { params, retries: 2 })
  return { success: true, data }
}

export default { createCustomer, createDepositAccount, issueCard, createACH, getTransactions }
