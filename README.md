```markdown
# SunLion Backend (sunlion-backend)

Small developer README for running the local backend API used in the SunLion project.

## Prerequisites
- Node.js (v18+) and npm installed locally
- Redis (only required for realtime service; not required to run this backend)

## Environment
Create a `.env` file in the project root (or set env vars in your environment). Useful vars:

- `PORT` (default 5000)
- `JWT_SECRET` (secret for signing JWTs)
- `JWT_EXPIRES` (e.g. `15m`)
- `REFRESH_TOKEN_EXPIRES` (e.g. `7d`)
- `REALTIME_URL` (http(s) URL to the realtime service)
- `INTERNAL_API_KEY` (internal key used by emitter)
- `ADMIN_USER` / `ADMIN_PASS` or `ADMIN_PASS_HASH` (optional bootstrap admin)
- `USERS_STORE_PATH` (optional path for file-based user store; default `./data/users.json`)

An example `.env` (do NOT commit secrets):

```
PORT=5000
JWT_SECRET=change_this_in_production
JWT_EXPIRES=15m
REFRESH_TOKEN_EXPIRES=7d
REALTIME_URL=http://localhost:4000
INTERNAL_API_KEY=changeme
ADMIN_USER=admin
ADMIN_PASS=admin123
USERS_STORE_PATH=./data/users.json
```

## Install

```powershell
cd "c:\\Users\\<you>\\...\\sunlion-backend"
npm install
```

## Run (development)

```powershell
npm run dev
```

## Quick smoke-test (login)
1. Create a user via the `users.service.createUser` helper in code, or use the `ADMIN_USER`/`ADMIN_PASS` env fall-back.
2. Example curl to login (returns `accessToken` and sets `refresh` cookie):

```bash
curl -v -X POST http://localhost:5000/auth/login \
	-H "Content-Type: application/json" \
	-d '{"username":"admin","password":"admin123"}'
```

- The successful response body contains `{ ok: true, accessToken: "..." }` and the server sets an HTTP-only `refresh` cookie.
- To refresh the access token (reads the cookie):

```bash
curl -v http://localhost:5000/auth/refresh --cookie "refresh=<cookie-value>"
```

Dev helpers:
- `GET /auth/debug` — dev-only endpoint (only when `NODE_ENV !== 'production'`) to decode or verify a JWT. Provide the token via `Authorization: Bearer <token>` header or `?token=` query param. Useful to inspect `isAdmin` and `roles` claims.

Example:
```bash
curl -H "Authorization: Bearer <TOKEN>" http://localhost:5000/auth/debug
```

## Notes & Next steps
- This backend uses a simple file-backed users store (`data/users.json`) by default; replace with a real DB for production.
- The realtime emitter expects `REALTIME_URL` and `INTERNAL_API_KEY` to call the realtime service internal endpoints.
- Use TLS and a secrets manager in production; rotate `JWT_SECRET` and `INTERNAL_API_KEY`.

***
File: README.md
```
