import argparse
import json
import random
import sqlite3
import time
from datetime import datetime, timedelta
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


def http_post_json(url: str, payload: dict, headers: dict) -> tuple[int, str]:
    data = json.dumps(payload).encode("utf-8")
    req = Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    for k, v in headers.items():
        req.add_header(k, v)
    try:
        with urlopen(req, timeout=15) as resp:
            return resp.status, resp.read().decode("utf-8", errors="ignore")
    except HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="ignore")
    except URLError as e:
        return 0, str(e)


def pick_profile(name: str) -> str:
    n = (name or "").lower()
    if "horno" in n:
        return "oven"
    if "micro" in n:
        return "microwave"
    if "aire" in n or "ac" in n:
        return "ac"
    if "heladera" in n or "fridge" in n:
        return "fridge"
    if "pc" in n or "comput" in n:
        return "pc"
    return "generic"


def power_for(profile: str, dt: datetime) -> float:
    h = dt.hour
    r = random.random()

    if profile == "oven":
        if 18 <= h <= 22 and r < 0.55:
            return random.uniform(1400, 2200)
        if 12 <= h <= 14 and r < 0.20:
            return random.uniform(1000, 1800)
        return random.uniform(0, 80)

    if profile == "microwave":
        if (7 <= h <= 9 or 12 <= h <= 14 or 20 <= h <= 22) and r < 0.15:
            return random.uniform(700, 1200)
        return random.uniform(0, 30)

    if profile == "ac":
        if 13 <= h <= 23 and r < 0.70:
            return random.uniform(600, 1200)
        return random.uniform(0, 120)

    if profile == "fridge":
        if r < 0.40:
            return random.uniform(80, 160)
        return random.uniform(0, 30)

    if profile == "pc":
        base = random.uniform(60, 180)
        if (18 <= h <= 23 or 0 <= h <= 1) and r < 0.35:
            return random.uniform(200, 450)
        return base

    if 18 <= h <= 23 and r < 0.30:
        return random.uniform(150, 600)
    return random.uniform(0, 80)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", default="http://127.0.0.1:5000")
    ap.add_argument("--db", default="data/sisterna.sqlite")
    ap.add_argument("--days", type=int, default=14)
    ap.add_argument("--interval-minutes", type=int, default=60)
    ap.add_argument("--limit", type=int, default=5)
    ap.add_argument("--sleep-ms", type=int, default=0)
    args = ap.parse_args()

    con = sqlite3.connect(args.db)
    con.row_factory = sqlite3.Row
    devs = con.execute("SELECT id, name, api_key FROM devices ORDER BY id ASC").fetchall()
    con.close()

    if not devs:
        print("No hay dispositivos en la DB. Crealos desde el admin primero.")
        return

    devs = devs[: max(1, args.limit)]
    print(f"Usando {len(devs)} dispositivos:")
    for d in devs:
        print(f"  id={d['id']} name={d['name']}")

    now = datetime.now()
    start = (now - timedelta(days=args.days)).replace(minute=0, second=0, microsecond=0)
    step = timedelta(minutes=args.interval_minutes)

    post_url = args.base_url.rstrip("/") + "/api/v1/measurements"

    total_sent = 0
    t = start

    while t <= now:
        for d in devs:
            api_key = d["api_key"]
            if not api_key:
                print(f"[{t}] WARNING device={d['id']} sin api_key, salteado")
                continue

            profile = pick_profile(d["name"])
            power = power_for(profile, t)  # W
            voltage = random.uniform(218, 222)
            current = (power / voltage) if voltage > 0 else 0.0
            energy_wh = power * (args.interval_minutes / 60.0)

            payload = {
                "ts": t.strftime("%Y-%m-%d %H:%M:%S"),
                "voltage": round(voltage, 2),
                "current": round(current, 3),
                "power": round(power, 2),
                "energy_wh": round(energy_wh, 4),
            }

            status, body = http_post_json(
                post_url,
                payload,
                headers={"X-API-Key": api_key},
            )

            if status not in (200, 201):
                print(f"[{t}] ERROR device={d['id']} status={status} body={body[:200]}")
            else:
                total_sent += 1

            if args.sleep_ms > 0:
                time.sleep(args.sleep_ms / 1000.0)

        t += step

    print(f"OK. Mediciones enviadas: {total_sent}")


if __name__ == "__main__":
    main()
