import json
import secrets
import time
import threading
from datetime import datetime
from flask import Blueprint, current_app, jsonify, request, render_template
from urllib import error as urlerror
from urllib import parse as urlparse
from urllib import request as urlrequest

from .db import get_con

api_bp = Blueprint("api", __name__, url_prefix="/api/v1")
web_bp = Blueprint("web", __name__)

def _db_path() -> str:
    return current_app.config["SETTINGS"].db_path

def _auth_config():
    settings = current_app.config["SETTINGS"]
    return settings.supabase_url, settings.supabase_anon_key

def _extract_bearer_token() -> str:
    auth_header = (request.headers.get("Authorization") or "").strip()
    if not auth_header.lower().startswith("bearer "):
        return ""
    return auth_header[7:].strip()

# ---------------------------------------------------------------------------
# Simple in-process token cache with configurable TTL (default 60 s)
# ---------------------------------------------------------------------------
_TOKEN_CACHE_TTL = 60  # seconds
_TOKEN_CACHE_MAX_SIZE = 1000
_token_cache: dict[str, tuple[dict, float]] = {}
_token_cache_lock = threading.Lock()


def _cached_fetch_supabase_user(access_token: str) -> dict | None:
    """Return cached user dict or fetch from Supabase and cache the result."""
    now = time.monotonic()
    with _token_cache_lock:
        entry = _token_cache.get(access_token)
        if entry is not None:
            user, expires_at = entry
            if now < expires_at:
                return user
            # Expired – remove stale entry
            del _token_cache[access_token]

    user = _fetch_supabase_user(access_token)

    if user and user.get("id"):
        with _token_cache_lock:
            # Evict all expired entries if at capacity before inserting
            if len(_token_cache) >= _TOKEN_CACHE_MAX_SIZE:
                expired_keys = [k for k, (_, exp) in _token_cache.items() if now >= exp]
                for k in expired_keys:
                    del _token_cache[k]
                # If still at capacity after eviction, remove oldest entries
                if len(_token_cache) >= _TOKEN_CACHE_MAX_SIZE:
                    overflow = len(_token_cache) - _TOKEN_CACHE_MAX_SIZE + 1
                    for k in list(_token_cache.keys())[:overflow]:
                        del _token_cache[k]
            _token_cache[access_token] = (user, now + _TOKEN_CACHE_TTL)

    return user

def _fetch_supabase_user(access_token: str):
    if not access_token:
        return None

    supabase_url, supabase_anon_key = _auth_config()
    if not supabase_url or not supabase_anon_key:
        raise RuntimeError("Supabase auth is not configured on backend.")

    user_endpoint = urlparse.urljoin(supabase_url.rstrip("/") + "/", "auth/v1/user")
    req = urlrequest.Request(
        user_endpoint,
        headers={
            "apikey": supabase_anon_key,
            "Authorization": f"Bearer {access_token}",
        },
    )

    try:
        with urlrequest.urlopen(req, timeout=5) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
            return payload
    except urlerror.HTTPError as e:
        if e.code in (401, 403):
            return None
        raise

def _require_user():
    token = _extract_bearer_token()
    if not token:
        return None, (jsonify({"error": "Missing bearer token"}), 401)

    try:
        user = _cached_fetch_supabase_user(token)
    except RuntimeError as e:
        return None, (jsonify({"error": str(e)}), 500)
    except Exception:
        return None, (jsonify({"error": "Could not validate Supabase token"}), 500)

    if not user or not user.get("id"):
        return None, (jsonify({"error": "Invalid or expired token"}), 401)

    return user, None


_PLAN_ALIASES: dict[str, str] = {
    "premium": "premium",
    "plan_premium": "premium",
    "pro": "premium",
    "avanzado": "avanzado",
    "advanced": "avanzado",
    "plan_avanzado": "avanzado",
}
_PLAN_METADATA_KEYS = ("plan", "subscription_plan", "subscription", "tier", "plan_name")


def _normalize_plan(value: object) -> str:
    """Return canonical plan name from a raw metadata value."""
    raw = str(value or "").strip().lower()
    return _PLAN_ALIASES.get(raw, "basico")


def _plan_from_user(user: dict) -> str:
    """Extract the subscription plan from a Supabase user object."""
    meta = user.get("user_metadata") or {}
    if not isinstance(meta, dict):
        meta = {}
    for key in _PLAN_METADATA_KEYS:
        if key in meta:
            return _normalize_plan(meta[key])
    return "basico"@web_bp.get("/")
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
    user, auth_error = _require_user()
    if auth_error:
        return auth_error

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    threshold = float(data.get("monthly_threshold_wh") or 0)

    if not name:
        return jsonify({"error": "name is required"}), 400

    api_key = secrets.token_hex(16)
    owner_user_id = user["id"]
    owner_email = (user.get("email") or "").strip() or None

    with get_con(_db_path()) as con:
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


@api_bp.get("/devices")
def list_devices():
    user, auth_error = _require_user()
    if auth_error:
        return auth_error

    with get_con(_db_path()) as con:
        rows = con.execute(
            """
            SELECT id, name, monthly_threshold_wh, created_at
            FROM devices
            WHERE owner_user_id = ?
            ORDER BY id
            """,
            (user["id"],),
        ).fetchall()

    return jsonify([dict(r) for r in rows])

@api_bp.patch("/devices/<int:device_id>")
def update_device(device_id: int):
    user, auth_error = _require_user()
    if auth_error:
        return auth_error

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

    params.extend([device_id, user["id"]])

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
            (device_id, user["id"]),
        ).fetchone()

    return jsonify(dict(row)), 200

@api_bp.delete("/devices/<int:device_id>")
def delete_device(device_id: int):
    """
    Elimina un dispositivo y sus mediciones.
    """
    user, auth_error = _require_user()
    if auth_error:
        return auth_error

    with get_con(_db_path()) as con:
        # Verificar que exista
        row = con.execute(
            "SELECT id, name FROM devices WHERE id = ? AND owner_user_id = ?",
            (device_id, user["id"]),
        ).fetchone()
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
    user, auth_error = _require_user()
    if auth_error:
        return auth_error

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
        WHERE d.owner_user_id = ?
    """

    params = [month, user["id"]]

    if device_id is not None:
        base_sql += "\nAND d.id = ?"
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
    user, auth_error = _require_user()
    if auth_error:
        return auth_error

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
        owns_device = con.execute(
            "SELECT 1 FROM devices WHERE id = ? AND owner_user_id = ?",
            (device_id, user["id"]),
        ).fetchone()
        if not owns_device:
            return jsonify({"error": "device not found"}), 404

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
    user, auth_error = _require_user()
    if auth_error:
        return auth_error

    if _plan_from_user(user) != "premium":
        return jsonify({"error": "CSV export requires a Premium plan"}), 403

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
                WHERE d.owner_user_id = ?
                  AND substr(m.ts, 1, 10) >= ?
                  AND substr(m.ts, 1, 10) <= ?
                  AND m.device_id = ?
                ORDER BY m.ts ASC
                """,
                (user["id"], date_from, date_to, device_id),
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
                WHERE d.owner_user_id = ?
                  AND substr(m.ts, 1, 10) >= ?
                  AND substr(m.ts, 1, 10) <= ?
                ORDER BY m.ts ASC
                """,
                (user["id"], date_from, date_to),
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

@api_bp.get("/export/daily.csv")
def export_daily_csv():
    """
    GET /api/v1/export/daily.csv?month=YYYY-MM&device_id=1
    """
    user, auth_error = _require_user()
    if auth_error:
        return auth_error

    if _plan_from_user(user) != "premium":
        return jsonify({"error": "CSV export requires a Premium plan"}), 403

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
                WHERE d.owner_user_id = ?
                  AND substr(m.ts, 1, 10) >= ?
                  AND substr(m.ts, 1, 10) <= ?
                  AND m.device_id = ?
                GROUP BY day, m.device_id, d.name
                ORDER BY day ASC
                """,
                (user["id"], date_from, date_to, device_id),
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
                WHERE d.owner_user_id = ?
                  AND substr(m.ts, 1, 10) >= ?
                  AND substr(m.ts, 1, 10) <= ?
                GROUP BY day, m.device_id, d.name
                ORDER BY day ASC, m.device_id ASC
                """,
                (user["id"], date_from, date_to),
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

'---------------------------'
# EXPORT ALERTS CSV
@api_bp.get("/export/alerts.csv")
def export_alerts_csv():
    """
    GET /api/v1/export/alerts.csv?month=YYYY-MM&device_id=1
    Exporta alertas del mes: dispositivos cuyo consumo mensual supera monthly_threshold_wh.
    """
    user, auth_error = _require_user()
    if auth_error:
        return auth_error

    if _plan_from_user(user) != "premium":
        return jsonify({"error": "CSV export requires a Premium plan"}), 403

    month = (request.args.get("month") or "").strip()
    device_id = request.args.get("device_id", type=int)

    if not month or len(month) != 7 or month[4] != "-":
        return jsonify({"error": "month is required as YYYY-MM"}), 400

    # Consulta robusta: filtra por mes usando substr(ts, 1, 7) = 'YYYY-MM'
    with get_con(_db_path()) as con:
        if device_id:
            rows = con.execute(
                """
                SELECT
                    d.id AS device_id,
                    d.name AS device_name,
                    COALESCE(d.monthly_threshold_wh, 0) AS threshold_wh,
                    COALESCE(SUM(m.energy_wh), 0) AS energy_wh
                FROM devices d
                LEFT JOIN measurements m
                    ON m.device_id = d.id
                AND substr(m.ts, 1, 7) = ?
                WHERE d.owner_user_id = ?
                  AND d.id = ?
                GROUP BY d.id, d.name, d.monthly_threshold_wh
                HAVING COALESCE(SUM(m.energy_wh), 0) > COALESCE(d.monthly_threshold_wh, 0)
                ORDER BY COALESCE(SUM(m.energy_wh), 0) DESC
                """,
                (month, user["id"], device_id),
            ).fetchall()

        else:
            rows = con.execute(
                """
                SELECT
                    d.id AS device_id,
                    d.name AS device_name,
                    COALESCE(d.monthly_threshold_wh, 0) AS threshold_wh,
                    COALESCE(SUM(m.energy_wh), 0) AS energy_wh
                FROM devices d
                LEFT JOIN measurements m
                    ON m.device_id = d.id
                AND substr(m.ts, 1, 7) = ?
                WHERE d.owner_user_id = ?
                GROUP BY d.id, d.name, d.monthly_threshold_wh
                HAVING COALESCE(SUM(m.energy_wh), 0) > COALESCE(d.monthly_threshold_wh, 0)
                ORDER BY COALESCE(SUM(m.energy_wh), 0) DESC
                """,
                (month, user["id"]),
            ).fetchall()


    output = io.StringIO()
    w = csv.writer(output)
    w.writerow([
        "device_id",
        "device_name",
        "threshold_wh",
        "energy_wh",
        "energy_kwh",
        "exceed_wh",
        "exceed_pct",
    ])

    for r in rows:
        d = dict(r)
        thr = float(d.get("threshold_wh") or 0.0)
        ewh = float(d.get("energy_wh") or 0.0)
        exceed = max(0.0, ewh - thr)
        pct = (exceed / thr * 100.0) if thr > 0 else 0.0
        w.writerow([
            d.get("device_id"),
            d.get("device_name"),
            int(thr),
            round(ewh, 4),
            round(ewh / 1000.0, 6),
            round(exceed, 4),
            round(pct, 2),
        ])

    filename = f"alerts_{month}"
    if device_id:
        filename += f"_device{device_id}"
    filename += ".csv"

    resp = Response(output.getvalue(), mimetype="text/csv; charset=utf-8")
    resp.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    return resp
