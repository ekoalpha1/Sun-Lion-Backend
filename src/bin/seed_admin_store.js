#!/usr/bin/env node
import dotenv from 'dotenv'
import * as adminService from '../services/admin.service.js'

dotenv.config()

async function main() {
  try {
    const out = await adminService.seedSampleData()
    console.log('Seeded admin store:')
    console.log('  customers:', (out.customers || []).length)
    console.log('  accounts :', (out.accounts || []).length)
    console.log('  txs     :', (out.transactions || []).length)
    console.log('Store path: ', process.env.ADMIN_STORE_PATH || './data/admin_store.json')
    process.exit(0)
  } catch (err) {
    console.error('Seeding failed:', err?.message || err)
    process.exit(1)
  }
}

main()
