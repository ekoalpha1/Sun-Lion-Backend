#!/usr/bin/env node
import dotenv from 'dotenv'

dotenv.config()

// When running inside the backend container, the service listens on port 5000.
// Allow overriding with `API_URL` (host tests) or `API` env.
const API = process.env.API_URL || process.env.API || 'http://localhost:5000'
const USER = process.env.ADMIN_USER || 'admin'
const PASS = process.env.ADMIN_PASS || 'admin123'

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USER, password: PASS })
  })
  let body
  try { body = await res.json() } catch (e) { body = null }
  console.log('login ->', res.status, body)
  const setCookie = res.headers.get('set-cookie')
  if (setCookie) console.log('set-cookie:', setCookie)
  return { body, setCookie }
}

async function refresh(setCookie) {
  if (!setCookie) {
    console.log('no set-cookie found; cannot refresh')
    return
  }
  const cookieHeader = setCookie.split(';')[0]
  const res = await fetch(`${API}/auth/refresh`, {
    headers: { 'Cookie': cookieHeader }
  })
  let body
  try { body = await res.json() } catch (e) { body = null }
  console.log('refresh ->', res.status, body)
}

;(async () => {
  try {
    console.log(`API: ${API}, user: ${USER}`)
    const r = await login()
    await refresh(r.setCookie)
    process.exit(0)
  } catch (err) {
    console.error('smoke test error', err)
    process.exit(1)
  }
})()
