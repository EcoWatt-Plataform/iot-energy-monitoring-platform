PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  owner_user_id TEXT,
  owner_email TEXT,
  monthly_threshold_wh REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS measurements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL,
  ts TEXT NOT NULL,
  voltage REAL,
  current REAL,
  power REAL,
  energy_wh REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(device_id) REFERENCES devices(id)
);

CREATE INDEX IF NOT EXISTS idx_measurements_device_ts
ON measurements(device_id, ts);

CREATE INDEX IF NOT EXISTS idx_devices_owner_user_id
ON devices(owner_user_id);

CREATE TABLE IF NOT EXISTS checkout_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan TEXT NOT NULL,
  plan_price_ars INTEGER NOT NULL,         -- ARS * 100 (centavos)
  max_meters INTEGER NOT NULL,
  plug_qty INTEGER NOT NULL,
  panel_qty INTEGER NOT NULL,
  panel_1f_qty INTEGER NOT NULL DEFAULT 0,
  panel_3f_qty INTEGER NOT NULL DEFAULT 0,
  extra_phase_qty INTEGER NOT NULL DEFAULT 0,
  hardware_total_ars INTEGER NOT NULL,     -- ARS * 100 (centavos)
  total_ars INTEGER NOT NULL,              -- ARS * 100 (centavos)
  idempotency_key TEXT,
  buyer_full_name TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_document_type TEXT NOT NULL,
  buyer_document_number TEXT NOT NULL,
  buyer_address TEXT NOT NULL,
  property_type TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_checkout_requests_created_at
ON checkout_requests(created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_checkout_requests_idempotency_key
ON checkout_requests(idempotency_key)
WHERE idempotency_key IS NOT NULL;
