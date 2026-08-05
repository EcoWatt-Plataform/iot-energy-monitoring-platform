import io
import csv
import calendar

from ..db import get_con
from . import _db_path


def export_measurements_csv(owner_user_id: str, month: str, device_id: int | None):
    """Returns (csv_string, filename) or (error_response, status_code)."""
    if not month or len(month) != 7 or month[4] != "-":
        return None, None, ("month is required as YYYY-MM", 400)

    try:
        y = int(month[:4])
        m = int(month[5:7])
        last_day = calendar.monthrange(y, m)[1]
    except Exception:
        return None, None, ("invalid month format, expected YYYY-MM", 400)

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
                (owner_user_id, date_from, date_to, device_id),
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
                (owner_user_id, date_from, date_to),
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

    return output.getvalue(), filename, None


def export_daily_csv(owner_user_id: str, month: str, device_id: int | None):
    """Returns (csv_string, filename, None) or (None, None, (error_msg, status))."""
    if not month or len(month) != 7 or month[4] != "-":
        return None, None, ("month is required as YYYY-MM", 400)

    try:
        y = int(month[:4])
        m = int(month[5:7])
        last_day = calendar.monthrange(y, m)[1]
    except Exception:
        return None, None, ("invalid month format, expected YYYY-MM", 400)

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
                (owner_user_id, date_from, date_to, device_id),
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
                (owner_user_id, date_from, date_to),
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

    return output.getvalue(), filename, None


def export_alerts_csv(owner_user_id: str, month: str, device_id: int | None):
    """Returns (csv_string, filename, None) or (None, None, (error_msg, status))."""
    if not month or len(month) != 7 or month[4] != "-":
        return None, None, ("month is required as YYYY-MM", 400)

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
                (month, owner_user_id, device_id),
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
                (month, owner_user_id),
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

    return output.getvalue(), filename, None
