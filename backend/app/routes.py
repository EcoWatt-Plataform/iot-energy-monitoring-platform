import secrets
from datetime import datetime
from flask import Blueprint, current_app, jsonify, request, render_template

from .db import get_con

api_bp = Blueprint("api", __name__, url_prefix="/api/v1")
web_bp = Blueprint("web", __name__)

def _db_path() -> str:
    return current_app.config["SETTINGS"].db_path

@web_bp.get("/")
def home():
    return render_template("index.html")

@web_bp.get("/health")
def health():
    return {"ok": True, "time": datetime.utcnow().isoformat() + "Z"}

# ---------------------------
# DEVICES
# ---------------------------
@api_bp.post("/devices")
def create_device():
    """
    Crea un dispositivo.
    Body JSON: { "name": "Casa", "monthly_threshold_wh": 25000 }
    Respuesta: { id, name, api_key, monthly_threshold_wh }
    """
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    threshold = float(data.get("monthly_threshold_wh") or 0)

    if not name:
        return jsonify({"error": "name is required"}), 400

    api_key = secrets.token_hex(16)

    with get_con(_db_path()) as con:
        cur = con.execute(
            "INSERT INTO devices(name, api_key, monthly_threshold_wh) VALUES (?, ?, ?)",
            (name, api_key, threshold),
        )
        device_id = cur.lastrowid

    return jsonify({
        "id": device_id,
        "name": name,
        "api_key": api_key,
        "monthly_threshold_wh": threshold
    }), 201


@api_bp.get("/devices")
def list_devices():
    with get_con(_db_path()) as con:
        rows = con.execute(
            "SELECT id, name, monthly_threshold_wh, created_at FROM devices ORDER BY id"
        ).fetchall()

    return jsonify([dict(r) for r in rows])


# ---------------------------
# INGEST (ESP32 -> API)
# ---------------------------
@api_bp.post("/measurements")
def ingest_measurement():
    """
    ESP32 manda medición.
    Header: X-API-Key: <api_key del device>
    Body JSON:
    {
      "ts": "2026-01-07T12:00:00Z",
      "voltage": 220.1,
      "current": 1.42,
      "power": 312.5,
      "energy_wh": 12.3
    }
    """
    api_key = (request.headers.get("X-API-Key") or "").strip()
    if not api_key:
        return jsonify({"error": "Missing X-API-Key"}), 401

    payload = request.get_json(silent=True) or {}
    ts = (payload.get("ts") or "").strip()
    energy_wh = payload.get("energy_wh")

    if not ts or energy_wh is None:
        return jsonify({"error": "ts and energy_wh are required"}), 400

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

    return jsonify({"ok": True}), 201


# ---------------------------
# METRICS (Dashboard)
# ---------------------------
@api_bp.get("/metrics/summary_month")
def summary_month():
    """
    Dashboard pide resumen del mes.
    Query: month=YYYY-MM   ej: 2026-01

    Respuesta:
    {
      month,
      devices: [{id,name,monthly_threshold_wh,energy_wh}],
      top_consumer: {...} | null,
      alerts: [...]
    }
    """
    month = (request.args.get("month") or "").strip()
    if not month or len(month) != 7:
        return jsonify({"error": "month must be YYYY-MM"}), 400

    with get_con(_db_path()) as con:
        totals = con.execute(
            """
            SELECT d.id, d.name, d.monthly_threshold_wh,
                   COALESCE(SUM(m.energy_wh), 0) AS energy_wh
            FROM devices d
            LEFT JOIN measurements m
              ON m.device_id = d.id
             AND substr(m.ts, 1, 7) = ?
            GROUP BY d.id
            ORDER BY energy_wh DESC
            """,
            (month,),
        ).fetchall()

    devices = []
    alerts = []
    for r in totals:
        item = dict(r)
        devices.append(item)

        thr = float(item["monthly_threshold_wh"] or 0)
        val = float(item["energy_wh"] or 0)
        if thr > 0 and val > thr:
            alerts.append({
                "device_id": item["id"],
                "device_name": item["name"],
                "energy_wh": val,
                "threshold_wh": thr,
                "type": "MONTHLY_THRESHOLD_EXCEEDED"
            })

    top = devices[0] if devices else None
    return jsonify({
        "month": month,
        "devices": devices,
        "top_consumer": top,
        "alerts": alerts
    })
