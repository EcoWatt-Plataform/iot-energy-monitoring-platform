import secrets
from flask import jsonify

from ..db import get_con
from . import _db_path
from .plan_service import _plan_device_limit


def _device_counts_by_owner() -> dict[str, int]:
    with get_con(_db_path()) as con:
        rows = con.execute(
            """
            SELECT owner_user_id, COUNT(*) AS device_count
            FROM devices
            WHERE owner_user_id IS NOT NULL AND owner_user_id <> ''
            GROUP BY owner_user_id
            """
        ).fetchall()
    return {str(r["owner_user_id"]): int(r["device_count"] or 0) for r in rows}


def create_device(owner_user_id: str, owner_email: str | None, name: str, threshold: float, owner_plan: str):
    max_devices = _plan_device_limit(owner_plan)
    api_key = secrets.token_hex(16)

    with get_con(_db_path()) as con:
        if max_devices is not None:
            row = con.execute(
                """
                SELECT COUNT(*) AS total
                FROM devices
                WHERE owner_user_id = ?
                """,
                (owner_user_id,),
            ).fetchone()
            total_devices = int(row["total"] or 0) if row else 0
            if total_devices >= max_devices:
                return jsonify({
                    "error": (
                        f"Plan {owner_plan.capitalize()} allows up to {max_devices} "
                        f"device(s) per account"
                    )
                }), 403

        cur = con.execute(
            """
            INSERT INTO devices(name, api_key, owner_user_id, owner_email, monthly_threshold_wh)
            VALUES (?, ?, ?, ?, ?)
            """,
            (name, api_key, owner_user_id, owner_email, threshold),
        )
        device_id = cur.lastrowid

    return jsonify({
        "id": device_id,
        "name": name,
        "api_key": api_key,
        "monthly_threshold_wh": threshold
    }), 201


def list_devices(owner_user_id: str):
    with get_con(_db_path()) as con:
        rows = con.execute(
            """
            SELECT id, name, monthly_threshold_wh, created_at
            FROM devices
            WHERE owner_user_id = ?
            ORDER BY id
            """,
            (owner_user_id,),
        ).fetchall()

    return jsonify([dict(r) for r in rows])


def update_device(device_id: int, owner_user_id: str, data: dict):
    fields = []
    params = []

    # Renombrar
    if "name" in data:
        name = str(data["name"]).strip()
        if not name:
            return jsonify({"error": "name must be non-empty"}), 400
        if len(name) > 80:
            return jsonify({"error": "name too long (max 80)"}), 400
        fields.append("name = ?")
        params.append(name)

    # Cambiar threshold
    if "monthly_threshold_wh" in data:
        try:
            thr = float(data["monthly_threshold_wh"])
            if thr < 0:
                return jsonify({"error": "monthly_threshold_wh must be >= 0"}), 400
        except (TypeError, ValueError):
            return jsonify({"error": "monthly_threshold_wh must be a number"}), 400
        fields.append("monthly_threshold_wh = ?")
        params.append(thr)

    if not fields:
        return jsonify({"error": "provide at least one field: name, monthly_threshold_wh"}), 400

    params.extend([device_id, owner_user_id])

    with get_con(_db_path()) as con:
        cur = con.execute(
            f"UPDATE devices SET {', '.join(fields)} WHERE id = ? AND owner_user_id = ?",
            tuple(params),
        )
        if cur.rowcount == 0:
            return jsonify({"error": "device not found"}), 404

        row = con.execute(
            """
            SELECT id, name, monthly_threshold_wh, created_at
            FROM devices
            WHERE id = ? AND owner_user_id = ?
            """,
            (device_id, owner_user_id),
        ).fetchone()

    return jsonify(dict(row)), 200


def delete_device(device_id: int, owner_user_id: str):
    with get_con(_db_path()) as con:
        # Verificar que exista
        row = con.execute(
            "SELECT id, name FROM devices WHERE id = ? AND owner_user_id = ?",
            (device_id, owner_user_id),
        ).fetchone()
        if not row:
            return jsonify({"error": "device not found"}), 404

        # Borrar mediciones primero (para evitar problemas de FK)
        con.execute("DELETE FROM measurements WHERE device_id = ?", (device_id,))
        con.execute("DELETE FROM devices WHERE id = ?", (device_id,))

    return jsonify({"ok": True, "deleted_device_id": device_id}), 200
