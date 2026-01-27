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

@api_bp.patch("/devices/<int:device_id>")
def update_device(device_id: int):
    data = request.get_json(silent=True) or {}

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

    params.append(device_id)

    with get_con(_db_path()) as con:
        cur = con.execute(
            f"UPDATE devices SET {', '.join(fields)} WHERE id = ?",
            tuple(params),
        )
        if cur.rowcount == 0:
            return jsonify({"error": "device not found"}), 404

        row = con.execute(
            "SELECT id, name, monthly_threshold_wh, created_at FROM devices WHERE id = ?",
            (device_id,),
        ).fetchone()

    return jsonify(dict(row)), 200

@api_bp.delete("/devices/<int:device_id>")
def delete_device(device_id: int):
    """
    Elimina un dispositivo y sus mediciones.
    """
    with get_con(_db_path()) as con:
        # Verificar que exista
        row = con.execute("SELECT id, name FROM devices WHERE id = ?", (device_id,)).fetchone()
        if not row:
            return jsonify({"error": "device not found"}), 404

        # Borrar mediciones primero (para evitar problemas de FK)
        con.execute("DELETE FROM measurements WHERE device_id = ?", (device_id,))
        con.execute("DELETE FROM devices WHERE id = ?", (device_id,))

    return jsonify({"ok": True, "deleted_device_id": device_id}), 200

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
    Query:
      - month=YYYY-MM  (obligatorio)
      - device_id=1    (opcional)

    Devuelve totales del mes + stats por dispositivo.
    Si se pasa device_id, filtra solo ese dispositivo.
    """
    month = (request.args.get("month") or "").strip()
    if not month or len(month) != 7:
        return jsonify({"error": "month must be YYYY-MM"}), 400

    device_id = request.args.get("device_id", type=int)

    # Query base: stats por dispositivo (LEFT JOIN para incluir devices sin mediciones)
    base_sql = """
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
    """

    params = [month]

    if device_id is not None:
        base_sql += "\nWHERE d.id = ?"
        params.append(device_id)

    base_sql += """
        GROUP BY d.id
        ORDER BY energy_wh DESC
    """

    with get_con(_db_path()) as con:
        rows = con.execute(base_sql, tuple(params)).fetchall()

    devices = []
    alerts = []
    month_total_wh = 0.0
    month_measurements = 0

    for r in rows:
        item = dict(r)
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
        "device_id": device_id,  # None si no se filtró
        "month_total_wh": month_total_wh,
        "month_total_kwh": month_total_wh / 1000.0,
        "month_measurements": month_measurements,
        "devices": devices,
        "top_consumer": top,
        "alerts": alerts
    })

@api_bp.get("/metrics/daily")
def metrics_daily():
    """
    Query:
      - device_id (int) obligatorio
      - from=YYYY-MM-DD obligatorio
      - to=YYYY-MM-DD obligatorio

    Devuelve consumo diario agrupado por día (YYYY-MM-DD).
    """
    device_id = request.args.get("device_id", type=int)
    date_from = (request.args.get("from") or "").strip()
    date_to = (request.args.get("to") or "").strip()

    if not device_id:
        return jsonify({"error": "device_id is required"}), 400
    if not date_from or len(date_from) != 10:
        return jsonify({"error": "from must be YYYY-MM-DD"}), 400
    if not date_to or len(date_to) != 10:
        return jsonify({"error": "to must be YYYY-MM-DD"}), 400

    with get_con(_db_path()) as con:
        rows = con.execute(
            """
            SELECT
              substr(m.ts, 1, 10) AS day,
              COALESCE(SUM(m.energy_wh), 0) AS energy_wh,
              COUNT(m.id) AS measurement_count,
              COALESCE(AVG(m.power), 0) AS avg_power,
              COALESCE(MAX(m.power), 0) AS max_power
            FROM measurements m
            WHERE m.device_id = ?
              AND substr(m.ts, 1, 10) >= ?
              AND substr(m.ts, 1, 10) <= ?
            GROUP BY substr(m.ts, 1, 10)
            ORDER BY day ASC
            """,
            (device_id, date_from, date_to),
        ).fetchall()

    days = []
    for r in rows:
        d = dict(r)
        d["energy_wh"] = float(d["energy_wh"] or 0)
        d["energy_kwh"] = d["energy_wh"] / 1000.0
        d["measurement_count"] = int(d["measurement_count"] or 0)
        d["avg_power"] = float(d["avg_power"] or 0)
        d["max_power"] = float(d["max_power"] or 0)
        days.append(d)

    return jsonify({
        "device_id": device_id,
        "from": date_from,
        "to": date_to,
        "days": days
    })

'---------------------------'
# EXPORT CSV'
import io
import csv
import calendar
from flask import Response, request, jsonify

@api_bp.get("/export/measurements.csv")
def export_measurements_csv():
    """
    GET /api/v1/export/measurements.csv?month=YYYY-MM&device_id=1

    - month (YYYY-MM) requerido
    - device_id opcional (si no, exporta todos)
    """
    month = (request.args.get("month") or "").strip()
    device_id = request.args.get("device_id", type=int)

    if not month or len(month) != 7 or month[4] != "-":
        return jsonify({"error": "month is required as YYYY-MM"}), 400

    try:
        y = int(month[:4])
        m = int(month[5:7])
        last_day = calendar.monthrange(y, m)[1]
    except Exception:
        return jsonify({"error": "invalid month format, expected YYYY-MM"}), 400

    date_from = f"{y:04d}-{m:02d}-01"
    date_to = f"{y:04d}-{m:02d}-{last_day:02d}"

    with get_con(_db_path()) as con:
        if device_id:
            rows = con.execute(
                """
                SELECT
                  m.ts,
                  m.device_id,
                  d.name AS device_name,
                  m.voltage,
                  m.current,
                  m.power,
                  m.energy_wh
                FROM measurements m
                JOIN devices d ON d.id = m.device_id
                WHERE substr(m.ts, 1, 10) >= ?
                  AND substr(m.ts, 1, 10) <= ?
                  AND m.device_id = ?
                ORDER BY m.ts ASC
                """,
                (date_from, date_to, device_id),
            ).fetchall()
        else:
            rows = con.execute(
                """
                SELECT
                  m.ts,
                  m.device_id,
                  d.name AS device_name,
                  m.voltage,
                  m.current,
                  m.power,
                  m.energy_wh
                FROM measurements m
                JOIN devices d ON d.id = m.device_id
                WHERE substr(m.ts, 1, 10) >= ?
                  AND substr(m.ts, 1, 10) <= ?
                ORDER BY m.ts ASC
                """,
                (date_from, date_to),
            ).fetchall()

    output = io.StringIO()
    w = csv.writer(output)
    w.writerow(["ts", "device_id", "device_name", "voltage", "current", "power", "energy_wh"])

    for r in rows:
        d = dict(r)
        w.writerow([
            d.get("ts"),
            d.get("device_id"),
            d.get("device_name"),
            d.get("voltage"),
            d.get("current"),
            d.get("power"),
            d.get("energy_wh"),
        ])

    filename = f"measurements_{month}"
    if device_id:
        filename += f"_device{device_id}"
    filename += ".csv"

    resp = Response(output.getvalue(), mimetype="text/csv; charset=utf-8")
    resp.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    return resp

'---------------------------'
# EXPORT DAILY CSV

import io
import csv
import calendar
from flask import Response, request, jsonify

@api_bp.get("/export/daily.csv")
def export_daily_csv():
    """
    GET /api/v1/export/daily.csv?month=YYYY-MM&device_id=1
    """
    month = (request.args.get("month") or "").strip()
    device_id = request.args.get("device_id", type=int)

    if not month or len(month) != 7 or month[4] != "-":
        return jsonify({"error": "month is required as YYYY-MM"}), 400

    try:
        y = int(month[:4])
        m = int(month[5:7])
        last_day = calendar.monthrange(y, m)[1]
    except Exception:
        return jsonify({"error": "invalid month format, expected YYYY-MM"}), 400

    date_from = f"{y:04d}-{m:02d}-01"
    date_to = f"{y:04d}-{m:02d}-{last_day:02d}"

    with get_con(_db_path()) as con:
        if device_id:
            rows = con.execute(
                """
                SELECT
                  substr(m.ts, 1, 10) AS day,
                  m.device_id,
                  d.name AS device_name,
                  SUM(m.energy_wh) AS energy_wh
                FROM measurements m
                JOIN devices d ON d.id = m.device_id
                WHERE substr(m.ts, 1, 10) >= ?
                  AND substr(m.ts, 1, 10) <= ?
                  AND m.device_id = ?
                GROUP BY day, m.device_id, d.name
                ORDER BY day ASC
                """,
                (date_from, date_to, device_id),
            ).fetchall()
        else:
            rows = con.execute(
                """
                SELECT
                  substr(m.ts, 1, 10) AS day,
                  m.device_id,
                  d.name AS device_name,
                  SUM(m.energy_wh) AS energy_wh
                FROM measurements m
                JOIN devices d ON d.id = m.device_id
                WHERE substr(m.ts, 1, 10) >= ?
                  AND substr(m.ts, 1, 10) <= ?
                GROUP BY day, m.device_id, d.name
                ORDER BY day ASC, m.device_id ASC
                """,
                (date_from, date_to),
            ).fetchall()

    output = io.StringIO()
    w = csv.writer(output)
    w.writerow(["day", "device_id", "device_name", "energy_kwh"])

    for r in rows:
        d = dict(r)
        kwh = (float(d.get("energy_wh") or 0.0) / 1000.0)
        w.writerow([d.get("day"), d.get("device_id"), d.get("device_name"), round(kwh, 6)])

    filename = f"daily_{month}"
    if device_id:
        filename += f"_device{device_id}"
    filename += ".csv"

    resp = Response(output.getvalue(), mimetype="text/csv; charset=utf-8")
    resp.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    return resp
