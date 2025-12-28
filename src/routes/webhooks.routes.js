import express from 'express'
import * as webhooksController from '../controllers/webhooks.controller.js'

const router = express.Router()

router.post('/payment', webhooksController.payment)

export default router
