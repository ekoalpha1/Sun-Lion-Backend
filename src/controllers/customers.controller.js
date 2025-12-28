import * as customersService from '../services/customers.service.js'

export async function list(req, res) {
  try {
    if (customersService && typeof customersService.listCustomers === 'function') {
      const rows = await customersService.listCustomers()
      return res.json({ ok: true, customers: rows })
    }
    return res.json({ ok: true, customers: [] })
  } catch (err) {
    console.error('customers.list error', err)
    return res.status(500).json({ error: 'internal' })
  }
}

export async function get(req, res) {
  try {
    const id = req.params.id
    if (customersService && typeof customersService.getCustomer === 'function') {
      const c = await customersService.getCustomer(id)
      return res.json({ ok: true, customer: c })
    }
    return res.status(404).json({ error: 'not found' })
  } catch (err) {
    console.error('customers.get error', err)
    return res.status(500).json({ error: 'internal' })
  }
}

export async function register(req, res) {
  try {
    const { name, email, metadata } = req.body
    if (!name || !email) return res.status(400).json({ error: 'name and email required' })
    const out = await customersService.registerCustomer({ name, email, metadata })
    return res.json({ ok: true, customer: out })
  } catch (err) {
    console.error('customers.register error', err)
    if (err.message === 'customer_exists') return res.status(409).json({ error: 'customer_exists' })
    return res.status(500).json({ error: 'internal' })
  }
}

export async function approve(req, res) {
  try {
    const id = req.params.id
    if (!id) return res.status(400).json({ error: 'id required' })
    const out = await customersService.approveCustomer(id, { approvedBy: req.user?.id || 'admin' })
    return res.json({ ok: true, customer: out })
  } catch (err) {
    console.error('customers.approve error', err)
    if (err.message === 'customer_not_found') return res.status(404).json({ error: 'customer_not_found' })
    return res.status(500).json({ error: 'internal' })
  }
}
