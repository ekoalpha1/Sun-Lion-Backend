import db from '../config/db.js'

export async function query(text, params) {
  return db.query(text, params)
}

export default { query }
