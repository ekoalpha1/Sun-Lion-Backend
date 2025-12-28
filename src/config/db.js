import dotenv from 'dotenv'

dotenv.config()

const DB_URL = process.env.DATABASE_URL || process.env.PG_CONNECTION || process.env.MYSQL_CONNECTION
const DB_TYPE = process.env.DB_TYPE || (DB_URL && DB_URL.startsWith('mysql') ? 'mysql' : 'pg')

let db = null

if (DB_TYPE === 'mysql') {
  // mysql2 promise wrapper
  const mysql = await import('mysql2/promise')
  const connOptions = DB_URL ? { uri: DB_URL } : {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'sunlion',
    port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306
  }
  // If DB_URL provided, mysql2 supports connection uri via createPool(DB_URL)
  const pool = DB_URL ? mysql.createPool(DB_URL) : mysql.createPool(connOptions)
  db = {
    query: async (sql, params) => {
      const start = Date.now()
      const [rows] = await pool.query(sql, params)
      const duration = Date.now() - start
      return { rows }
    },
    pool
  }
} else {
  // default to Postgres
  const { Pool } = await import('pg')
  const connection = DB_URL || 'postgres://sunlion:sunlionpass@localhost:5432/sunlion'
  const pool = new Pool({ connectionString: connection })
  db = {
    query: async (text, params) => {
      const start = Date.now()
      const res = await pool.query(text, params)
      const duration = Date.now() - start
      return res
    },
    pool
  }
}

export default db
