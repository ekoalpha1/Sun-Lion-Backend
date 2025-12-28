import express from 'express'
import bodyParser from 'body-parser'
import dotenv from 'dotenv'
import morgan from 'morgan'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { globalLimiter } from './middleware/rate.middleware.js'

dotenv.config()

const app = express()
app.use(globalLimiter)
app.use(bodyParser.json())
app.use(morgan('dev'))
// enable CORS for frontend (set CORS_ORIGIN env to restrict)
app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }))
app.use(cookieParser())

// Mount routes
import accountsRouter from './routes/accounts.routes.js'
import authRouter from './routes/auth.routes.js'
import customersRouter from './routes/customers.routes.js'
import transactionsRouter from './routes/transactions.routes.js'
import adminRouter from './routes/admin.routes.js'
import riskRouter from './routes/risk.routes.js'
import systemRouter from './routes/system.routes.js'
import webhooksRouter from './routes/webhooks.routes.js'

// middlewares
import { requireAuth } from './middleware/auth.middleware.js'
import { requireAdmin } from './middleware/admin.middleware.js'
import { errorHandler } from './middleware/error.middleware.js'

// Mount routers
app.use('/auth', authRouter)
// customers router allows public registration; individual routes enforce auth where needed
app.use('/customers', customersRouter)
app.use('/accounts', requireAuth, accountsRouter)
app.use('/transactions', requireAuth, transactionsRouter)
app.use('/admin', requireAuth, requireAdmin, adminRouter)
app.use('/risk', requireAuth, riskRouter)
app.use('/system', systemRouter)
app.use('/webhooks', webhooksRouter)

// health
app.get('/health', (req, res) => res.json({ status: 'ok' }))

// error handler (last)
app.use(errorHandler)

export default app
