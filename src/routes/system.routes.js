import express from 'express'
import * as systemController from '../controllers/system.controller.js'

const router = express.Router()

router.get('/status', systemController.status)

export default router
