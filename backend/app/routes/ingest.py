from datetime import datetime
from flask import jsonify, request

from . import api_bp
from ..db import get_con
from ..services import _db_path


@api_bp.post("/measurements")
def ingest_measurement():
    """
    ESP32 manda medición.
    Header: X-API-Key: <api_key del device>

    Body JSON (ts opcional):
    {
      "ts": "2026-01-07T12:00:00Z",   <-- opcional
      "voltage": 220.1,
      "current": 1.42,
      "power": 312.5,
      "energy_wh": 12.3              <-- requerido
    }

    Si no viene ts, el backend usa UTC actual.
    """
    api_key = (request.headers.get("X-API-Key") or "").strip()
    if not api_key:
        return jsonify({"error": "Missing X-API-Key"}), 401

    payload = request.get_json(silent=True) or {}

    # ts ahora es OPCIONAL: si no viene, lo generamos en UTC
    ts = (payload.get("ts") or "").strip()
    if not ts:
        ts = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

    energy_wh = payload.get("energy_wh")
    if energy_wh is None:
        return jsonify({"error": "energy_wh is required"}), 400

    voltage = payload.get("voltage")
    current = payload.get("current")
    power = payload.get("power")

    with get_con(_db_path()) as con:
        dev = con.execute(
            "SELECT id FROM devices WHERE api_key = ?",
            (api_key,)
        ).fetchone()

        if not dev:
            return jsonify({"error": "Invalid API key"}), 403

        con.execute(
            """INSERT INTO measurements(device_id, ts, voltage, current, power, energy_wh)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (dev["id"], ts, voltage, current, power, float(energy_wh)),
        )

    return jsonify({"ok": True, "ts": ts}), 201
