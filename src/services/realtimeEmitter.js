import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const REALTIME_URL = process.env.REALTIME_URL || 'http://localhost:4000'
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || ''
const DEFAULT_TIMEOUT = 5000

function sleep(ms){
  return new Promise((r) => setTimeout(r, ms))
}

async function postWithRetries(path, body, opts = {}){
  const url = `${REALTIME_URL.replace(/\/$/, '')}${path}`
  const maxRetries = opts.retries ?? 3
  const timeout = opts.timeout ?? DEFAULT_TIMEOUT

  for (let attempt = 0; attempt <= maxRetries; attempt++){
    try {
      const resp = await axios.post(url, body, {
        timeout,
        headers: {
          'x-internal-key': INTERNAL_API_KEY,
          'content-type': 'application/json',
        }
      })
      return resp.data
    } catch (err) {
      const isLast = attempt === maxRetries
      const status = err?.response?.status
      // don't retry on 4xx except 429
      if (status && status >= 400 && status < 500 && status !== 429) {
        throw err
      }
      if (isLast) throw err
      const backoff = Math.min(1000 * 2 ** attempt, 10000)
      await sleep(backoff)
    }
  }
}

export async function emitTransaction({ userId, transaction }){
  if (!userId || !transaction) throw new Error('userId and transaction required')
  return postWithRetries('/internal/emit/transaction', { userId, transaction })
}

export async function emitBalance({ accountId, balance }){
  if (!accountId || typeof balance === 'undefined') throw new Error('accountId and balance required')
  return postWithRetries('/internal/emit/balance', { accountId, balance })
}

export default { emitTransaction, emitBalance }
