export function requirePermission(permission) {
  return (req, res, next) => {
    const user = req.user
    if (!user) return res.status(401).json({ error: 'unauthenticated' })
    const perms = user.permissions || []
    if (perms.includes(permission)) return next()
    // roles check
    const roles = user.roles || []
    if (permission === 'admin' && (user.isAdmin || user.role === 'admin' || roles.includes('admin'))) return next()
    return res.status(403).json({ error: 'forbidden' })
  }
}
