from ..db import get_con
from . import _db_path


def get_summary_month(owner_user_id: str, month: str, device_id: int | None):
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

    params = [month, owner_user_id]

    if device_id is not None:
        base_sql += "\nAND d.id = ?"
        params.append(device_id)

    base_sql += """
        GROUP BY d.id
        ORDER BY energy_wh DESC
    """

    with get_con(_db_path()) as con:
        rows = con.execute(base_sql, tuple(params)).fetchall()

        # Para cada dispositivo con alerta, detectamos el primer timestamp
        # en el que la energía acumulada del mes supera su umbral.
        threshold_map: dict[int, float] = {}
        for r in rows:
            energy_wh = float(r["energy_wh"] or 0)
            thr = float(r["monthly_threshold_wh"] or 0)
            if thr > 0 and energy_wh > thr:
                threshold_map[int(r["id"])] = thr

        crossed_at_by_device: dict[int, str] = {}
        if threshold_map:
            placeholders = ",".join("?" for _ in threshold_map)
            crossing_rows = con.execute(
                f"""
                SELECT m.device_id, m.ts, m.energy_wh
                FROM measurements m
                WHERE m.device_id IN ({placeholders})
                  AND substr(m.ts, 1, 7) = ?
                ORDER BY m.device_id ASC, m.ts ASC, m.id ASC
                """,
                tuple(list(threshold_map.keys()) + [month]),
            ).fetchall()

            running_wh: dict[int, float] = {}
            for row in crossing_rows:
                dev_id = int(row["device_id"])
                if dev_id in crossed_at_by_device:
                    continue

                running_wh[dev_id] = running_wh.get(dev_id, 0.0) + float(row["energy_wh"] or 0.0)
                if running_wh[dev_id] > threshold_map[dev_id]:
                    crossed_at_by_device[dev_id] = str(row["ts"])

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
            exceed_wh = max(0.0, item["energy_wh"] - thr)
            exceed_pct = (exceed_wh / thr * 100.0) if thr > 0 else 0.0
            alerts.append({
                "device_id": item["id"],
                "device_name": item["name"],
                "energy_wh": item["energy_wh"],
                "threshold_wh": thr,
                "exceed_wh": exceed_wh,
                "exceed_pct": round(exceed_pct, 2),
                "crossed_at": crossed_at_by_device.get(int(item["id"])),
                "type": "MONTHLY_THRESHOLD_EXCEEDED"
            })

    top = devices[0] if devices else None

    return {
        "month": month,
        "device_id": device_id,
        "month_total_wh": month_total_wh,
        "month_total_kwh": month_total_wh / 1000.0,
        "month_measurements": month_measurements,
        "devices": devices,
        "top_consumer": top,
        "alerts": alerts
    }


def get_daily_metrics(device_id: int, owner_user_id: str, date_from: str, date_to: str):
    with get_con(_db_path()) as con:
        owns_device = con.execute(
            "SELECT 1 FROM devices WHERE id = ? AND owner_user_id = ?",
            (device_id, owner_user_id),
        ).fetchone()
        if not owns_device:
            return None  # caller returns 404

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

    return {
        "device_id": device_id,
        "from": date_from,
        "to": date_to,
        "days": days
    }
