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
        con.commit()

@contextmanager
def get_con(db_path: str):
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    try:
        yield con
        con.commit()
    finally:
        con.close()
