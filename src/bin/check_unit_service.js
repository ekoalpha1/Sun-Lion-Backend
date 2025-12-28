#!/usr/bin/env node
import * as unit from '../services/unit.service.js'

try {
  console.log('unit.service loaded', Object.keys(unit))
  process.exit(0)
} catch (err) {
  console.error('unit.service load error', err && err.stack ? err.stack : err)
  process.exit(2)
}
