import express from 'express'
import { body } from 'express-validator'
import * as authController from '../controllers/auth.controller.js'
import { validate } from '../middleware/validation.middleware.js'
import { authLimiter } from '../middleware/rate.middleware.js'

const router = express.Router()

router.post('/login', authLimiter, [body('username').isString().notEmpty(), body('password').isString().notEmpty()], validate, authController.login)
router.get('/me', authController.me)
router.post('/refresh', authController.refresh)
// convenience: allow GET refresh using cookie (used by smoke tests)
router.get('/refresh', authController.refresh)
// dev-only: decode a token and return its payload (useful for debugging)
if (process.env.NODE_ENV !== 'production') {
	router.get('/debug', authController.debugToken)
}

export default router
