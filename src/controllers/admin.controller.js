import * as adminService from '../services/admin.service.js'

export async function index(req, res) {
  try {
    return res.json({ ok: true, info: 'admin root' })
  } catch (err) {
    console.error('admin.index error', err)
    return res.status(500).json({ error: 'internal' })
  }
}

export async function listCustomers(req, res) {
  try {
    const rows = await adminService.listCustomers()
    return res.json({ ok: true, customers: rows })
  } catch (err) {
    console.error('admin.listCustomers error', err)
    return res.status(500).json({ error: 'internal' })
  }
}

export async function listAccounts(req, res) {
  try {
    const rows = await adminService.listAccounts()
    return res.json({ ok: true, accounts: rows })
  } catch (err) {
    console.error('admin.listAccounts error', err)
    return res.status(500).json({ error: 'internal' })
  }
}

export async function listTransactions(req, res) {
  try {
    const { accountId } = req.query
    const rows = await adminService.listTransactions({ accountId })
    return res.json({ ok: true, transactions: rows })
  } catch (err) {
    console.error('admin.listTransactions error', err)
    return res.status(500).json({ error: 'internal' })
  }
}

export async function freezeAccount(req, res) {
  try {
    const { accountId } = req.body
    if (!accountId) return res.status(400).json({ error: 'accountId required' })
    const acct = await adminService.freezeAccount(accountId)
    return res.json({ ok: true, account: acct })
  } catch (err) {
    console.error('admin.freezeAccount error', err)
    if (err.message === 'account_not_found') return res.status(404).json({ error: 'account_not_found' })
    return res.status(500).json({ error: 'internal' })
  }
}

export async function seedSamples(req, res) {
  try {
    const out = await adminService.seedSampleData()
    return res.json({ ok: true, seeded: true, summary: { customers: out.customers.length, accounts: out.accounts.length, transactions: out.transactions.length } })
  } catch (err) {
    console.error('admin.seedSamples error', err)
    return res.status(500).json({ error: 'internal' })
  }
}

export async function generateAccount(req, res) {
  try {
    const { customerId, type, currency, initialBalance } = req.body
    if (!customerId) return res.status(400).json({ error: 'customerId required' })
    const acct = await adminService.generateAccount({ customerId, type, currency, initialBalance })
    return res.json({ ok: true, account: acct })
  } catch (err) {
    console.error('admin.generateAccount error', err)
    return res.status(500).json({ error: 'internal' })
  }
}

export async function blockAccount(req, res) {
  try {
    const { accountId, reason } = req.body
    if (!accountId) return res.status(400).json({ error: 'accountId required' })
    const acct = await adminService.blockAccount(accountId, { reason })
    return res.json({ ok: true, account: acct })
  } catch (err) {
    console.error('admin.blockAccount error', err)
    if (err.message === 'account_not_found') return res.status(404).json({ error: 'account_not_found' })
    return res.status(500).json({ error: 'internal' })
  }
}

export async function unblockAccount(req, res) {
  try {
    const { accountId } = req.body
    if (!accountId) return res.status(400).json({ error: 'accountId required' })
    const acct = await adminService.unblockAccount(accountId)
    return res.json({ ok: true, account: acct })
  } catch (err) {
    console.error('admin.unblockAccount error', err)
    if (err.message === 'account_not_found') return res.status(404).json({ error: 'account_not_found' })
    return res.status(500).json({ error: 'internal' })
  }
}

export async function createSubAccount(req, res) {
  try {
    const { parentAccountId, label, type } = req.body
    if (!parentAccountId) return res.status(400).json({ error: 'parentAccountId required' })
    const acct = await adminService.createSubAccount(parentAccountId, { label, type })
    return res.json({ ok: true, account: acct })
  } catch (err) {
    console.error('admin.createSubAccount error', err)
    if (err.message === 'parent_account_not_found') return res.status(404).json({ error: 'parent_account_not_found' })
    return res.status(500).json({ error: 'internal' })
  }
}

export async function issueDebitCard(req, res) {
  try {
    const { accountId, cardholderName, brand, color, virtual } = req.body
    if (!accountId) return res.status(400).json({ error: 'accountId required' })
    const card = await adminService.issueDebitCard(accountId, { cardholderName, brand, color, virtual })
    return res.json({ ok: true, card })
  } catch (err) {
    console.error('admin.issueDebitCard error', err)
    if (err.message === 'account_not_found') return res.status(404).json({ error: 'account_not_found' })
    return res.status(500).json({ error: 'internal' })
  }
}

export async function verifyLicense(req, res) {
  try {
    const { licenseKey } = req.body
    if (!licenseKey) return res.status(400).json({ error: 'licenseKey required' })
    const out = await adminService.verifyAppLicense(licenseKey)
    return res.json({ ok: true, verification: out })
  } catch (err) {
    console.error('admin.verifyLicense error', err)
    return res.status(500).json({ error: 'internal' })
  }
}

export async function createSupportTicketController(req, res) {
  try {
    const { customerId, subject, message } = req.body
    if (!customerId || !subject || !message) return res.status(400).json({ error: 'customerId, subject and message required' })
    const ticket = await adminService.createSupportTicket({ customerId, subject, message, createdBy: req.user?.id || 'admin' })
    return res.json({ ok: true, ticket })
  } catch (err) {
    console.error('admin.createSupportTicket error', err)
    return res.status(500).json({ error: 'internal' })
  }
}

export async function troubleshootCustomer(req, res) {
  try {
    const { customerId } = req.params
    if (!customerId) return res.status(400).json({ error: 'customerId required' })
    const out = await adminService.troubleshootCustomer(customerId)
    return res.json({ ok: true, diagnostic: out })
  } catch (err) {
    console.error('admin.troubleshootCustomer error', err)
    return res.status(500).json({ error: 'internal' })
  }
}

export async function unitCreateAccountController(req, res) {
  try {
    const opts = req.body || {}
    const out = await adminService.unitCreateAccount(opts)
    return res.json({ ok: true, result: out })
  } catch (err) {
    console.error('admin.unitCreateAccountController error', err)
    return res.status(500).json({ error: 'internal' })
  }
}

export async function stripeCreateCardTokenController(req, res) {
  try {
    const cardInfo = req.body || {}
    const out = await adminService.stripeCreateCardToken(cardInfo)
    return res.json({ ok: true, token: out })
  } catch (err) {
    console.error('admin.stripeCreateCardTokenController error', err)
    return res.status(500).json({ error: 'internal' })
  }
}
