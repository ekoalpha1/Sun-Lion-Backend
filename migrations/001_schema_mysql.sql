-- MySQL schema for SunLion (converted from Postgres)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  roles JSON DEFAULT JSON_ARRAY(),
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64),
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(64),
  kyc JSON,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounts (
  id VARCHAR(64) PRIMARY KEY,
  customer_id VARCHAR(64),
  balance DECIMAL(18,2) DEFAULT 0.00,
  currency VARCHAR(8) DEFAULT 'USD',
  ledger_id VARCHAR(128),
  product VARCHAR(128),
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(64) PRIMARY KEY,
  account_id VARCHAR(64),
  type VARCHAR(64),
  amount DECIMAL(18,2),
  currency VARCHAR(8),
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cards (
  id VARCHAR(64) PRIMARY KEY,
  account_id VARCHAR(64),
  brand VARCHAR(32),
  last4 VARCHAR(4),
  status VARCHAR(32),
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64),
  subject VARCHAR(255),
  body TEXT,
  status VARCHAR(32) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS licenses (
  id VARCHAR(64) PRIMARY KEY,
  customer_id VARCHAR(64),
  license_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS risk_flags (
  id VARCHAR(64) PRIMARY KEY,
  customer_id VARCHAR(64),
  flag JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
