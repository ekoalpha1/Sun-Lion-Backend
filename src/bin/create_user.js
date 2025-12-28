#!/usr/bin/env node
import dotenv from 'dotenv'
import { createUser, findByUsername } from '../services/users.service.js'

dotenv.config()

const [,, usernameArg, passwordArg] = process.argv
const username = usernameArg || process.env.TEST_USER || 'test@local'
const password = passwordArg || process.env.TEST_PASS || 'password123'

async function main() {
  try {
    const existing = await findByUsername(username)
    if (existing) {
      console.log('User already exists:', existing.id)
      process.exit(0)
    }
    const user = await createUser({ username, password, roles: ['user'], isAdmin: false })
    console.log('Created user:')
    console.log({ id: user.id, username: user.username })
    process.exit(0)
  } catch (err) {
    console.error('Error creating user:', err?.message || err)
    process.exit(1)
  }
}

main()
