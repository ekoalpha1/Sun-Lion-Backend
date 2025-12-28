import express from 'express'
import * as adminController from '../controllers/admin.controller.js'

const router = express.Router()

router.get('/', adminController.index)
router.get('/customers', adminController.listCustomers)
router.get('/accounts', adminController.listAccounts)
router.get('/transactions', adminController.listTransactions)
router.post('/freeze-account', adminController.freezeAccount)
router.post('/seed-samples', adminController.seedSamples)

// Admin tools
router.post('/generate-account', adminController.generateAccount)
router.post('/block-account', adminController.blockAccount)
router.post('/unblock-account', adminController.unblockAccount)
router.post('/subaccount', adminController.createSubAccount)
router.post('/issue-card', adminController.issueDebitCard)
router.post('/verify-license', adminController.verifyLicense)
router.post('/support/tickets', adminController.createSupportTicketController)
router.get('/troubleshoot/:customerId', adminController.troubleshootCustomer)

// Integration stubs
router.post('/integrations/unit/create-account', adminController.unitCreateAccountController)
router.post('/integrations/stripe/token', adminController.stripeCreateCardTokenController)

export default router
