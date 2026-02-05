#!/usr/bin/env python3
import argparse
import calendar
import random
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
import secrets


@dataclass
class DeviceProfile:
    name: str
    threshold_wh: float
    # potencia cuando está "activo"
    active_w_min: float
    active_w_max: float
    # potencia cuando está "idle" (casi apagado)
    idle_w_min: float
    idle_w_max: float
    # horarios donde suele estar activo (0-23) y prob de estar activo en esos horarios
    active_hours: set
    active_prob: float


PROFILES = [
    DeviceProfile(
        name="Horno Electrico",
        threshold_wh=12000,
        active_w_min=1400, active_w_max=2200,
        idle_w_min=0, idle_w_max=5,
        active_hours=set([12, 13, 20, 21]),
        active_prob=0.35,
    ),
    DeviceProfile(
        name="Microondas",
        threshold_wh=3000,
        active_w_min=900, active_w_max=1500,
        idle_w_min=0, idle_w_max=2,
        active_hours=set([8, 13, 20, 21]),
        active_prob=0.10,
    ),
    DeviceProfile(
        name="Aire Acondicionado",
        threshold_wh=20000,
        active_w_min=700, active_w_max=1400,
        idle_w_min=0, idle_w_max=3,
        active_hours=set([0, 1, 2, 3, 14, 15, 16, 21, 22, 23]),
        active_prob=0.45,
    ),
    DeviceProfile(
        name="Heladera",
        threshold_wh=60000,
        active_w_min=60, active_w_max=180,
        idle_w_min=20, idle_w_max=60,
        active_hours=set(range(0, 24)),
        active_prob=0.75,
    ),
    DeviceProfile(
        name="PC Escritorio",
        threshold_wh=15000,
        active_w_min=80, active_w_max=250,
        idle_w_min=2, idle_w_max=10,
        active_hours=set([9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]),
        active_prob=0.55,
    ),
]


def connect(db_path: Path) -> sqlite3.Connection:
    con = sqlite3.connect(str(db_path))
    con.row_factory = sqlite3.Row
    return con


def ensure_tables(con: sqlite3.Connection) -> None:
    # chequeo mínimo: que existan tablas
    tables = {r["name"] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    missing = [t for t in ("devices", "measurements") if t not in tables]
    if missing:
        raise RuntimeError(f"Faltan tablas en la DB: {missing}. Ejecutá el backend una vez para crear el schema.")


def get_or_create_device(con: sqlite3.Connection, name: str, threshold_wh: float) -> int:
    row = con.execute("SELECT id FROM devices WHERE name = ?", (name,)).fetchone()
    if row:
        device_id = int(row["id"])
        con.execute("UPDATE devices SET monthly_threshold_wh = ? WHERE id = ?", (threshold_wh, device_id))
        return device_id

    api_key = secrets.token_hex(16)
    con.execute(
        "INSERT INTO devices (name, api_key, monthly_threshold_wh) VALUES (?, ?, ?)",
        (name, api_key, threshold_wh),
    )
    return int(con.execute("SELECT last_insert_rowid() AS id").fetchone()["id"])


def generate_power(profile: DeviceProfile, hour: int) -> float:
    is_active_window = hour in profile.active_hours
    active = is_active_window and (random.random() < profile.active_prob)

    if active:
        return random.uniform(profile.active_w_min, profile.active_w_max)

    # para heladera y similares dejamos un “idle” no-cero
    return random.uniform(profile.idle_w_min, profile.idle_w_max)


def daterange_points(days: int, interval_minutes: int) -> list[datetime]:
    now = datetime.now().replace(second=0, microsecond=0)
    start = now - timedelta(days=days)
    # redondeo al múltiplo del intervalo
    start = start.replace(minute=(start.minute // interval_minutes) * interval_minutes)
    points = []
    t = start
    step = timedelta(minutes=interval_minutes)
    while t <= now:
        points.append(t)
        t += step
    return points


def main():
    parser = argparse.ArgumentParser(description="Seed demo: crea dispositivos y genera mediciones para el dashboard.")
    parser.add_argument("--db", default="data/sisterna.sqlite", help="Ruta a la DB SQLite (default: data/sisterna.sqlite)")
    parser.add_argument("--days", type=int, default=30, help="Días hacia atrás a generar (default: 30)")
    parser.add_argument("--interval-minutes", type=int, default=60, help="Intervalo en minutos (default: 60)")
    parser.add_argument("--limit", type=int, default=5, help="Cantidad de dispositivos a usar (default: 5)")
    parser.add_argument("--clear-range", action="store_true", help="Borra mediciones existentes del rango generado para esos devices")
    args = parser.parse_args()

    db_path = Path(args.db)
    if not db_path.exists():
        raise FileNotFoundError(f"No existe la DB: {db_path}. Corré el backend una vez para que la cree.")

    random.seed(42)

    points = daterange_points(args.days, args.interval_minutes)
    interval_h = args.interval_minutes / 60.0

    profiles = PROFILES[: max(1, min(args.limit, len(PROFILES)))]

    with connect(db_path) as con:
        ensure_tables(con)

        device_ids: list[int] = []
        for p in profiles:
            did = get_or_create_device(con, p.name, p.threshold_wh)
            device_ids.append(did)

        if args.clear_range:
            start_ts = points[0].strftime("%Y-%m-%d %H:%M:%S")
            placeholders = ",".join(["?"] * len(device_ids))
            con.execute(
                f"DELETE FROM measurements WHERE ts >= ? AND device_id IN ({placeholders})",
                (start_ts, *device_ids),
            )

        rows = []
        for t in points:
            ts = t.strftime("%Y-%m-%d %H:%M:%S")
            voltage = random.uniform(215.0, 230.0)
            hour = t.hour

            for did, p in zip(device_ids, profiles):
                power = generate_power(p, hour)
                current = (power / voltage) if voltage > 0 else 0.0
                energy_wh = power * interval_h

                # pequeño ruido numérico
                energy_wh = max(0.0, energy_wh + random.uniform(-0.2, 0.2))

                rows.append((ts, did, float(voltage), float(current), float(power), float(energy_wh)))

        con.executemany(
            """
            INSERT INTO measurements (ts, device_id, voltage, current, power, energy_wh)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            rows,
        )
        con.commit()

    print(f"OK ✅ Generadas {len(rows)} mediciones para {len(profiles)} dispositivos.")
    print(f"DB: {db_path}")


if __name__ == "__main__":
    main()
