import * as authService from '../services/auth.service.js'

export async function refresh(req, res) {
  try {
    // refresh request expects cookie with refresh info: { userId, refreshId }
    const cookie = req.cookies?.refresh
    if (!cookie) return res.status(401).json({ error: 'no_refresh' })
    let payload
    try { payload = JSON.parse(cookie) } catch (e) { return res.status(400).json({ error: 'bad_cookie' }) }
    const { userId, refreshId } = payload
    const out = await authService.refreshAccessToken({ userId, refreshId })
    return res.json({ ok: true, accessToken: out.accessToken })
  } catch (err) {
    console.error('auth.refresh error', err?.message || err)
    return res.status(401).json({ error: 'invalid_refresh' })
  }
}

export async function logout(req, res) {
  try {
    const cookie = req.cookies?.refresh
    if (cookie) {
      let payload
      try { payload = JSON.parse(cookie) } catch (e) { payload = null }
      if (payload && payload.userId && payload.refreshId) {
        await authService.revokeRefreshToken(payload.userId, payload.refreshId)
      }
    }
    res.clearCookie('refresh', { httpOnly: true, secure: process.env.NODE_ENV === 'production' })
    return res.json({ ok: true })
  } catch (err) {
    console.error('auth.logout error', err?.message || err)
    return res.status(500).json({ error: 'internal' })
  }
}

export default { refresh, logout }
