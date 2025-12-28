#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import db from '../config/db.js'

async function run() {
  const migrationsDir = path.join(process.cwd(), 'migrations')
  if (!fs.existsSync(migrationsDir)) {
    console.error('migrations directory not found:', migrationsDir)
    process.exit(1)
  }
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
  for (const f of files) {
    const p = path.join(migrationsDir, f)
    console.log('Running migration', f)
    const sql = fs.readFileSync(p, 'utf8')
    try {
      await db.query(sql)
      console.log('Applied', f)
    } catch (err) {
      console.error('Migration failed', f, err)
      process.exit(1)
    }
  }
  console.log('Migrations complete')
  process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
