export function requireAdmin(req, res, next) {
  // expect `req.user` to be populated by requireAuth
  const user = req.user
  if (!user) return res.status(401).json({ error: 'unauthenticated' })
  // check common properties: role, roles array, isAdmin flag
  const isAdmin = user.isAdmin || user.role === 'admin' || (Array.isArray(user.roles) && user.roles.includes('admin'))
  if (!isAdmin) return res.status(403).json({ error: 'forbidden' })
  return next()
}
