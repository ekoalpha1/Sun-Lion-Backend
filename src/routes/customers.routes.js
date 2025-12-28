import express from 'express'
import * as customersController from '../controllers/customers.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requireAdmin } from '../middleware/admin.middleware.js'

const router = express.Router()

// Public registration
router.post('/register', customersController.register)

// Read-only customer list/details (admin or authenticated)
router.get('/', requireAuth, customersController.list)
router.get('/:id', requireAuth, customersController.get)

// Approvals are admin-only
router.post('/:id/approve', requireAuth, requireAdmin, customersController.approve)

export default router
