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
