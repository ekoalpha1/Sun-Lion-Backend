import express from 'express'
import * as riskController from '../controllers/risk.controller.js'

const router = express.Router()

router.get('/', riskController.index)
router.get('/credit/:customerId', riskController.creditCheck)

export default router
