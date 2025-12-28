import express from 'express'
import * as transactionsController from '../controllers/transactions.controller.js'

const router = express.Router()

router.post('/', transactionsController.create)
router.get('/', transactionsController.list)
router.post('/transfer', transactionsController.transfer)
router.post('/transfer-to-user', transactionsController.transferToUser)
router.post('/direct-deposit', transactionsController.directDeposit)
router.get('/deposit-locations', transactionsController.depositLocations)

export default router
