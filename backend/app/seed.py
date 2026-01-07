import random
import secrets
from datetime import datetime, timedelta

from .config import Settings
from .db import init_db, get_con
import os

def run():
    settings = Settings.load()
    schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
    init_db(settings.db_path, schema_path)

    created_keys = []

    with get_con(settings.db_path) as con:
        count = con.execute("SELECT COUNT(*) as c FROM devices").fetchone()["c"]
        if count == 0:
            # Crea 2 dispositivos de ejemplo
            k1 = secrets.token_hex(16)
            k2 = secrets.token_hex(16)
            con.execute("INSERT INTO devices(name, api_key, monthly_threshold_wh) VALUES (?, ?, ?)",
                        ("Casa", k1, 25000))
            con.execute("INSERT INTO devices(name, api_key, monthly_threshold_wh) VALUES (?, ?, ?)",
                        ("PyME", k2, 60000))
            created_keys = [("Casa", k1), ("PyME", k2)]

        devices = con.execute("SELECT id FROM devices").fetchall()

        # Inserta 21 días de mediciones (una por día por dispositivo)
        today = datetime.utcnow().date()
        start = today - timedelta(days=20)

        for d in devices:
            for i in range(21):
                day = start + timedelta(days=i)
                ts = f"{day.isoformat()}T12:00:00Z"
                energy = random.uniform(400, 4000)  # Wh/día
                con.execute(
                    "INSERT INTO measurements(device_id, ts, voltage, current, power, energy_wh) VALUES (?, ?, ?, ?, ?, ?)",
                    (d["id"], ts, 220.0, random.uniform(0.5, 5.0), random.uniform(100, 1200), energy),
                )

    print("Seed OK: inserted devices + measurements.")
    if created_keys:
        print("API keys creadas (guardalas):")
        for name, key in created_keys:
            print(f" - {name}: {key}")

if __name__ == "__main__":
    run()
