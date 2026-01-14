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

# ---------------------------
# METRICS (Dashboard)
# ---------------------------
@api_bp.get("/metrics/summary_month")
def summary_month():
    """
    Query: month=YYYY-MM
    Devuelve totales del mes + stats por dispositivo.
    """
    month = (request.args.get("month") or "").strip()
    if not month or len(month) != 7:
        return jsonify({"error": "month must be YYYY-MM"}), 400

    with get_con(_db_path()) as con:
        rows = con.execute(
            """
            SELECT
              d.id,
              d.name,
              d.monthly_threshold_wh,
              COALESCE(SUM(m.energy_wh), 0) AS energy_wh,
              COUNT(m.id) AS measurement_count,
              COALESCE(AVG(m.power), 0) AS avg_power,
              COALESCE(MAX(m.power), 0) AS max_power,
              COALESCE(AVG(m.voltage), 0) AS avg_voltage,
              COALESCE(AVG(m.current), 0) AS avg_current
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
    month_total_wh = 0.0
    month_measurements = 0

    for r in rows:
        item = dict(r)
        # normalizar a float/int
        item["energy_wh"] = float(item["energy_wh"] or 0)
        item["energy_kwh"] = item["energy_wh"] / 1000.0
        item["measurement_count"] = int(item["measurement_count"] or 0)
        item["avg_power"] = float(item["avg_power"] or 0)
        item["max_power"] = float(item["max_power"] or 0)
        item["avg_voltage"] = float(item["avg_voltage"] or 0)
        item["avg_current"] = float(item["avg_current"] or 0)

        month_total_wh += item["energy_wh"]
        month_measurements += item["measurement_count"]

        devices.append(item)

        thr = float(item["monthly_threshold_wh"] or 0)
        if thr > 0 and item["energy_wh"] > thr:
            alerts.append({
                "device_id": item["id"],
                "device_name": item["name"],
                "energy_wh": item["energy_wh"],
                "threshold_wh": thr,
                "type": "MONTHLY_THRESHOLD_EXCEEDED"
            })

    top = devices[0] if devices else None

    return jsonify({
        "month": month,
        "month_total_wh": month_total_wh,
        "month_total_kwh": month_total_wh / 1000.0,
        "month_measurements": month_measurements,
        "devices": devices,
        "top_consumer": top,
        "alerts": alerts
    })