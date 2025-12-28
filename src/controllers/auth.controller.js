import * as authService from '../services/auth.service.js'

function parseExpireToMs(exp) {
  if (!exp || typeof exp !== 'string') return undefined
  const m = exp.match(/^(\d+)([smhd])$/)
  if (!m) return undefined
  const n = parseInt(m[1], 10)
  const unit = m[2]
  switch (unit) {
    case 's': return n * 1000
    case 'm': return n * 60 * 1000
    case 'h': return n * 60 * 60 * 1000
    case 'd': return n * 24 * 60 * 60 * 1000
    default: return undefined
  }
}

export async function login(req, res) {
  try {
    const { username, password } = req.body
    if (authService && typeof authService.login === 'function') {
      const out = await authService.login(username, password)
      // out: { accessToken, refreshId, user }
      if (out && out.refreshId && out.user) {
        const cookieVal = JSON.stringify({ userId: out.user.id, refreshId: out.refreshId })
        const maxAge = parseExpireToMs(process.env.REFRESH_TOKEN_EXPIRES || '7d')
        res.cookie('refresh', cookieVal, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          ...(maxAge ? { maxAge } : {})
        })
      }
      return res.json({ ok: true, accessToken: out.accessToken })
    }
    return res.status(501).json({ error: 'auth not implemented' })
  } catch (err) {
    console.error('auth.login error', err?.message || err)
    return res.status(401).json({ error: 'invalid_credentials' })
  }
}

export async function me(req, res) {
  return res.json({ ok: true, user: req.user || null })
}

export async function debugToken(req, res) {
  try {
    // Accept token via Authorization header or ?token= query
    const auth = req.headers.authorization || req.headers.Authorization
    let token = null
    if (auth) {
      const parts = String(auth).split(' ')
      token = parts.length === 2 && parts[0].toLowerCase() === 'bearer' ? parts[1] : parts[0]
    }
    if (!token) token = req.query.token
    if (!token) return res.status(400).json({ error: 'token_required' })
    // Use auth service verifyToken to decode (but don't enforce expiry)
    try {
      const payload = authService.verifyToken(token)
      return res.json({ ok: true, payload })
    } catch (err) {
      // token verify failed (maybe expired) — attempt to decode without verify
      try {
        const parts = String(token).split('.')
        if (parts.length < 2) return res.status(400).json({ error: 'invalid_token' })
        const b = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
        const decoded = JSON.parse(b)
        return res.json({ ok: true, payload: decoded, warning: 'signature_invalid_or_expired' })
      } catch (e) {
        return res.status(400).json({ error: 'invalid_token' })
      }
    }
  } catch (err) {
    console.error('auth.debugToken error', err)
    return res.status(500).json({ error: 'internal' })
  }
}

export async function refresh(req, res) {
  try {
    // Prefer cookie `refresh`, fallback to JSON body { userId, refreshId }
    let payload = null
    if (req.cookies && req.cookies.refresh) {
      try { payload = JSON.parse(req.cookies.refresh) } catch (e) { payload = null }
    }
    if (!payload && req.body) payload = req.body
    if (!payload || !payload.userId || !payload.refreshId) return res.status(400).json({ error: 'refresh_required' })
    const out = await authService.refreshAccessToken({ userId: payload.userId, refreshId: payload.refreshId })
    return res.json({ ok: true, accessToken: out.accessToken })
  } catch (err) {
    console.error('auth.refresh error', err?.message || err)
    return res.status(401).json({ error: 'invalid_refresh' })
  }
}
