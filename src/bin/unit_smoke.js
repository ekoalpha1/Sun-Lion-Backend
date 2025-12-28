#!/usr/bin/env node
import dotenv from 'dotenv'
import { randomUUID } from 'crypto'
import * as unit from '../services/unit.service.js'

dotenv.config()

async function run() {
  try {
    const id = Date.now().toString(36)
    const email = `smoke+${id}@example.com`
    console.log('Creating customer (email)', email)
    const cust = await unit.createCustomer({ name: `Smoke Test ${id}`, email, phone: '+15550001234' })
    console.log('Customer created id:', cust?.data?.id || cust?.id || '<unknown>')

    console.log('Creating deposit account for customer')
    const acct = await unit.createDepositAccount({ customerId: cust?.data?.id || cust?.id, product: 'deposit_account', currency: 'USD' })
    console.log('Account created id:', acct?.data?.id || acct?.id || '<unknown>')

    console.log('Smoke test completed successfully')
    process.exit(0)
  } catch (err) {
    // log status and body if available for easier diagnosis
    if (err && err.status) console.error('status:', err.status)
    if (err && err.body) console.error('body:', JSON.stringify(err.body))
    console.error('error message:', err && err.message ? err.message : err)
    if (err && err.stack) console.error(err.stack)
    process.exit(2)
  }
}

run()
