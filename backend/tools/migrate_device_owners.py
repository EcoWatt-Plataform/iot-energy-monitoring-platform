"""
Assign existing devices to a specific Supabase user.

Usage examples:
  python backend/tools/migrate_device_owners.py --owner-user-id <uuid>
  python backend/tools/migrate_device_owners.py --owner-user-id <uuid> --owner-email user@mail.com
  python backend/tools/migrate_device_owners.py --owner-user-id <uuid> --all
  python backend/tools/migrate_device_owners.py --owner-user-id <uuid> --device-ids 1,2,3
"""

from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path
from typing import Iterable


def parse_device_ids(raw: str | None) -> list[int]:
    if not raw:
        return []
    out: list[int] = []
    for chunk in raw.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        out.append(int(chunk))
    return out


def ensure_owner_columns(con: sqlite3.Connection) -> None:
    cols = {row[1] for row in con.execute("PRAGMA table_info(devices)").fetchall()}

    if "owner_user_id" not in cols:
        con.execute("ALTER TABLE devices ADD COLUMN owner_user_id TEXT")
    if "owner_email" not in cols:
        con.execute("ALTER TABLE devices ADD COLUMN owner_email TEXT")

    con.execute(
        "CREATE INDEX IF NOT EXISTS idx_devices_owner_user_id ON devices(owner_user_id)"
    )


def fetch_targets(
    con: sqlite3.Connection, all_devices: bool, device_ids: Iterable[int]
) -> list[sqlite3.Row]:
    ids = list(device_ids)
    con.row_factory = sqlite3.Row
    cur = con.cursor()

    if ids:
        placeholders = ",".join("?" for _ in ids)
        return cur.execute(
            f"SELECT id, name, owner_user_id, owner_email FROM devices WHERE id IN ({placeholders}) ORDER BY id",
            tuple(ids),
        ).fetchall()

    if all_devices:
        return cur.execute(
            "SELECT id, name, owner_user_id, owner_email FROM devices ORDER BY id"
        ).fetchall()

    return cur.execute(
        """
        SELECT id, name, owner_user_id, owner_email
        FROM devices
        WHERE owner_user_id IS NULL OR owner_user_id = ''
        ORDER BY id
        """
    ).fetchall()


def assign_owner(
    con: sqlite3.Connection,
    target_ids: list[int],
    owner_user_id: str,
    owner_email: str | None,
) -> int:
    if not target_ids:
        return 0

    placeholders = ",".join("?" for _ in target_ids)
    params: list[object] = [owner_user_id]

    if owner_email is not None:
        sql = f"""
            UPDATE devices
            SET owner_user_id = ?, owner_email = ?
            WHERE id IN ({placeholders})
        """
        params.append(owner_email)
    else:
        sql = f"""
            UPDATE devices
            SET owner_user_id = ?
            WHERE id IN ({placeholders})
        """

    params.extend(target_ids)
    cur = con.execute(sql, tuple(params))
    return cur.rowcount


def print_owner_summary(con: sqlite3.Connection) -> None:
    con.row_factory = sqlite3.Row
    rows = con.execute(
        """
        SELECT owner_user_id, owner_email, COUNT(*) AS devices
        FROM devices
        GROUP BY owner_user_id, owner_email
        ORDER BY devices DESC, owner_user_id
        """
    ).fetchall()

    print("\nOwner summary:")
    for row in rows:
        print(
            f"  owner_user_id={row['owner_user_id']!r}, owner_email={row['owner_email']!r}, devices={row['devices']}"
        )


def main() -> int:
    repo_root = Path(__file__).resolve().parents[2]
    default_db = repo_root / "backend" / "data" / "sisterna.sqlite"

    ap = argparse.ArgumentParser(
        description="Assign existing devices to a specific Supabase user."
    )
    ap.add_argument("--owner-user-id", required=True, help="Supabase user UUID (auth.users.id)")
    ap.add_argument("--owner-email", help="Optional email to store in devices.owner_email")
    ap.add_argument("--db-path", default=str(default_db), help="SQLite path")
    ap.add_argument(
        "--device-ids",
        help="Comma-separated device ids to reassign. If omitted, reassigns only unowned devices.",
    )
    ap.add_argument(
        "--all",
        action="store_true",
        help="Reassign all devices (ignored if --device-ids is provided).",
    )
    ap.add_argument("--dry-run", action="store_true", help="Show changes without updating")
    args = ap.parse_args()

    db_path = Path(args.db_path)
    if not db_path.exists():
        print(f"DB not found: {db_path}")
        return 2

    device_ids = parse_device_ids(args.device_ids)
    if not device_ids and not args.all:
        print("Mode: assigning only unowned devices.")
    elif args.all:
        print("Mode: assigning all devices.")
    else:
        print(f"Mode: assigning explicit ids: {device_ids}")

    con = sqlite3.connect(str(db_path))
    try:
        ensure_owner_columns(con)
        targets = fetch_targets(con, all_devices=args.all, device_ids=device_ids)

        print(f"DB: {db_path}")
        print(f"Targets: {len(targets)}")
        for row in targets:
            print(
                f"  id={row['id']}, name={row['name']!r}, owner_user_id={row['owner_user_id']!r}, owner_email={row['owner_email']!r}"
            )

        if args.dry_run:
            print("\nDry run: no updates applied.")
            return 0

        updated = assign_owner(
            con,
            target_ids=[int(r["id"]) for r in targets],
            owner_user_id=args.owner_user_id,
            owner_email=args.owner_email,
        )
        con.commit()

        print(f"\nUpdated rows: {updated}")
        print_owner_summary(con)
        return 0
    finally:
        con.close()


if __name__ == "__main__":
    raise SystemExit(main())
