"""
Genera mediciones demo para Mayo, Junio y Julio 2026.
Perfiles de consumo realistas para cada dispositivo.

Uso:
    pip install requests
    python tools/seed_demo.py
"""

import random
import requests
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed

URL = "https://ecowatt.ar/api/v1/measurements"
WORKERS = 8
INTERVAL_MIN = 15

DEVICES = [
    {
        "name": "Demo - Bomba de Agua",
        "api_key": "API_KEY_BOMBA",
        "voltage_range": (218.0, 222.0),
    },
    {
        "name": "Demo - Termotanque",
        "api_key": "API_KEY_TERMOTANQUE",
        "voltage_range": (218.0, 222.0),
    },
    {
        "name": "Demo - Lavarropas",
        "api_key": "API_KEY_LAVARROPAS",
        "voltage_range": (217.0, 223.0),
    },
    {
        "name": "Demo - Iluminacion Patio",
        "api_key": "API_KEY_ILUMINACION",
        "voltage_range": (219.0, 221.0),
    },
]

# Argentina = UTC-3
ARG_OFFSET = timedelta(hours=-3)


def ar_hour(dt_utc: datetime) -> int:
    return (dt_utc + ARG_OFFSET).hour


def ar_weekday(dt_utc: datetime) -> int:
    return (dt_utc + ARG_OFFSET).weekday()  # 0=lunes, 6=domingo


def ar_minute_of_day(dt_utc: datetime) -> int:
    dt_ar = dt_utc + ARG_OFFSET
    return dt_ar.hour * 60 + dt_ar.minute


# ─── Perfiles de potencia ───────────────────────────────────────────────────

def power_bomba(dt_utc: datetime) -> float:
    """
    Bomba de agua: activa en ventanas de mañana, mediodía y noche.
    ~500 W cuando corre, ~35% probabilidad por slot dentro de la ventana.
    """
    h = ar_hour(dt_utc)
    windows = [(6, 9), (12, 14), (19, 21)]
    for start, end in windows:
        if start <= h < end and random.random() < 0.35:
            return random.uniform(470, 530)
    return 0.0


def power_termotanque(dt_utc: datetime) -> float:
    """
    Termotanque eléctrico: calienta antes de ducharse (madrugada/mañana)
    y por la noche. Invierno -> más probable.
    ~1500 W cuando calienta.
    """
    h = ar_hour(dt_utc)
    # (hora_inicio, hora_fin, probabilidad_por_slot)
    windows = [(4, 8, 0.55), (20, 23, 0.45)]
    for start, end, prob in windows:
        if start <= h < end and random.random() < prob:
            return random.uniform(1380, 1580)
    return 0.0


def power_lavarropas(dt_utc: datetime) -> float:
    """
    Lavarropas: lunes, miércoles y sábado.
    Ciclo de 90 min a las 10h y a las 15h.
    Potencia variable: calentamiento (~1000W), lavado (~300W), centrifugado (~800W).
    """
    if ar_weekday(dt_utc) not in (0, 2, 5):  # lun, mié, sáb
        return 0.0
    mod = ar_minute_of_day(dt_utc)
    for cycle_start in (10 * 60, 15 * 60):
        cm = mod - cycle_start
        if 0 <= cm < 90:
            if cm < 30:
                return random.uniform(900, 1100)   # calentamiento
            elif cm < 60:
                return random.uniform(200, 400)    # lavado
            else:
                return random.uniform(650, 900)    # centrifugado
    return 0.0


def power_iluminacion(dt_utc: datetime) -> float:
    """
    Iluminación de patio: encendida de 18h a 23h (invierno en Argentina).
    ~150 W constante con pequeña variación.
    """
    h = ar_hour(dt_utc)
    if 18 <= h < 23:
        return random.uniform(135, 165)
    return 0.0


POWER_FNS = [power_bomba, power_termotanque, power_lavarropas, power_iluminacion]


# ─── Generación de slots ────────────────────────────────────────────────────

def generate_slots() -> list[datetime]:
    # Mayo 1 a Julio 9 (hoy), en UTC
    # 00:00 AR = 03:00 UTC
    start = datetime(2026, 5, 1, 3, 0, 0)
    end   = datetime(2026, 7, 9, 3, 0, 0)
    slots = []
    t = start
    while t < end:
        slots.append(t)
        t += timedelta(minutes=INTERVAL_MIN)
    return slots


# ─── Envío HTTP ─────────────────────────────────────────────────────────────

def send_measurement(api_key: str, voltage_range: tuple, dt_utc: datetime, power_w: float) -> bool:
    e_wh = power_w * (INTERVAL_MIN / 60.0)
    voltage = round(random.uniform(*voltage_range), 2)
    current = round(power_w / voltage, 4)

    payload = {
        "ts":        dt_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "voltage":   voltage,
        "current":   current,
        "power":     round(power_w, 2),
        "energy_wh": round(e_wh, 6),
    }
    try:
        r = requests.post(
            URL,
            json=payload,
            headers={"X-API-Key": api_key},
            timeout=10,
        )
        return r.status_code in (200, 201)
    except Exception as e:
        print(f"  ERROR: {e}")
        return False


# ─── Main ───────────────────────────────────────────────────────────────────

def main():
    random.seed(42)  # reproducible

    slots = generate_slots()
    print(f"Slots totales (cada {INTERVAL_MIN} min): {len(slots)}")
    print(f"Periodo: {slots[0]} UTC -> {slots[-1]} UTC\n")

    # Construir lista de tareas (solo potencia > 0)
    tasks = []
    for dev, fn in zip(DEVICES, POWER_FNS):
        for ts in slots:
            p = fn(ts)
            if p > 0:
                tasks.append((dev["api_key"], dev["voltage_range"], ts, p, dev["name"]))

    print(f"Mediciones a enviar (potencia > 0): {len(tasks)}")
    print(f"Enviando con {WORKERS} workers paralelos...\n")

    ok = 0
    fail = 0
    total = len(tasks)

    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        futures = {
            executor.submit(send_measurement, api_key, vrange, ts, p): name
            for api_key, vrange, ts, p, name in tasks
        }
        for i, future in enumerate(as_completed(futures), 1):
            if future.result():
                ok += 1
            else:
                fail += 1
            if i % 200 == 0 or i == total:
                pct = i / total * 100
                print(f"  [{pct:5.1f}%] {i}/{total} — OK: {ok} | Fail: {fail}")

    print(f"\n{'='*50}")
    print(f"FINALIZADO")
    print(f"  Enviadas OK : {ok}")
    print(f"  Fallidas    : {fail}")
    print(f"  Total       : {total}")

    # Resumen por dispositivo
    print(f"\nResumen por dispositivo:")
    for dev, fn in zip(DEVICES, POWER_FNS):
        count = sum(1 for ts in slots if fn(ts) > 0)
        print(f"  {dev['name']}: ~{count} mediciones")


if __name__ == "__main__":
    main()
