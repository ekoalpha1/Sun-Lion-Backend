export function genId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 9000 + 1000)}`
}

export function shortId() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}
