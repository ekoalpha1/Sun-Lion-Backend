import express from 'express'
import * as accountsController from '../controllers/accounts.controller.js'

const router = express.Router()

router.post('/:accountId/transactions', accountsController.createTransaction)
router.get('/:accountId/balance', accountsController.getBalance)

export default router
