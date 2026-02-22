import os
import sqlite3
from contextlib import contextmanager

def ensure_dir(path: str) -> None:
    folder = os.path.dirname(path)
    if folder and not os.path.exists(folder):
        os.makedirs(folder, exist_ok=True)

def init_db(db_path: str, schema_path: str) -> None:
    ensure_dir(db_path)
    with sqlite3.connect(db_path) as con:
        con.executescript(open(schema_path, "r", encoding="utf-8").read())
        _migrate_db(con)
        con.commit()

def _migrate_db(con: sqlite3.Connection) -> None:
    cols = {
        row[1]
        for row in con.execute("PRAGMA table_info(devices)").fetchall()
    }

    if "owner_user_id" not in cols:
        con.execute("ALTER TABLE devices ADD COLUMN owner_user_id TEXT")

    if "owner_email" not in cols:
        con.execute("ALTER TABLE devices ADD COLUMN owner_email TEXT")

    con.execute(
        "CREATE INDEX IF NOT EXISTS idx_devices_owner_user_id ON devices(owner_user_id)"
    )

    has_checkout_requests = con.execute(
        """
        SELECT 1
        FROM sqlite_master
        WHERE type = 'table' AND name = 'checkout_requests'
        """
    ).fetchone()

    if has_checkout_requests:
        checkout_cols = {
            row[1]
            for row in con.execute("PRAGMA table_info(checkout_requests)").fetchall()
        }

        if "panel_1f_qty" not in checkout_cols:
            con.execute(
                "ALTER TABLE checkout_requests ADD COLUMN panel_1f_qty INTEGER NOT NULL DEFAULT 0"
            )
        if "panel_3f_qty" not in checkout_cols:
            con.execute(
                "ALTER TABLE checkout_requests ADD COLUMN panel_3f_qty INTEGER NOT NULL DEFAULT 0"
            )
        if "extra_phase_qty" not in checkout_cols:
            con.execute(
                "ALTER TABLE checkout_requests ADD COLUMN extra_phase_qty INTEGER NOT NULL DEFAULT 0"
            )

@contextmanager
def get_con(db_path: str):
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    try:
        yield con
        con.commit()
    finally:
        con.close()
