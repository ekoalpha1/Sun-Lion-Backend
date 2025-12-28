export async function status(req, res) {
  return res.json({ ok: true, uptime: process.uptime() })
}
