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

@contextmanager
def get_con(db_path: str):
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    try:
        yield con
        con.commit()
    finally:
        con.close()
