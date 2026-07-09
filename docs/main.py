import network
import time
import ntptime
import ujson
import urequests
from machine import I2C, Pin

# --- WIFI / API ---
SSID = "WIFI NOMBRE"
PASS = "WIFI CONTRASEÑA"
URL = "https://ecowatt.ar/api/v1/measurements"
API_KEY = "###" 

# --- ZONA HORARIA (Argentina = UTC-3) ---
ARG_OFFSET_S = -3 * 3600

def sync_time_utc():
    """
    Sincroniza RTC por NTP (queda en UTC).
    """
    try:
        # podés cambiar el host si querés:
        # ntptime.host = "pool.ntp.org"
        ntptime.settime()
        print("NTP OK (UTC):", iso_utc())
        print("Hora AR:", iso_ar())
        return True
    except Exception as e:
        print("NTP error:", e)
        return False

def iso_from_localtime(t):
    y, mo, d, h, mi, s, wd, yd = t
    return f"{y:04d}-{mo:02d}-{d:02d} {h:02d}:{mi:02d}:{s:02d}"

def iso_utc():
    # time.localtime() en MicroPython queda en UTC luego de ntptime.settime()
    return iso_from_localtime(time.localtime()) + "Z"

def iso_ar():
    # convertimos UTC -> AR con offset fijo -3h
    return iso_from_localtime(time.localtime(time.time() + ARG_OFFSET_S))

# --- LEDS ---
LED_GREEN_GPIO = 23  # estado WiFi/Server
LED_RED_GPIO = 25    # LED de error

led_green = Pin(LED_GREEN_GPIO, Pin.OUT)
led_red = Pin(LED_RED_GPIO, Pin.OUT)
led_green.off()
led_red.off()

# --- BOTON (toggle envío + reset energía) ---
BTN_GPIO = 27
btn = Pin(BTN_GPIO, Pin.IN, Pin.PULL_UP)  # suelto=1, presionado=0

send_enabled = True       # corto: ON/OFF envío
energy_total_wh = 0.0     # largo: reset a 0

paused_energy_wh = 0.0    # energía acumulada mientras SEND OFF
send_just_enabled = False # al reactivar, el primer POST hace "sync" (hasta que salga 2xx)

_btn_last = 1
_press_start_ms = None
_last_change_ms = time.ticks_ms()
DEBOUNCE_MS = 60
LONG_PRESS_MS = 1200

def button_update(now_ms):
    """
    Retorna:
      "toggle" si pulsación corta
      "reset"  si pulsación larga
      None     si nada
    """
    global _btn_last, _press_start_ms, _last_change_ms

    v = btn.value()

    # debounce
    if v != _btn_last:
        if time.ticks_diff(now_ms, _last_change_ms) < DEBOUNCE_MS:
            return None
        _last_change_ms = now_ms
        _btn_last = v

        if v == 0:
            _press_start_ms = now_ms
        else:
            if _press_start_ms is None:
                return None
            dur = time.ticks_diff(now_ms, _press_start_ms)
            _press_start_ms = None

            if dur >= LONG_PRESS_MS:
                return "reset"
            else:
                return "toggle"

    return None

def handle_button_event(evt):
    global send_enabled, send_just_enabled, energy_total_wh, paused_energy_wh

    if evt == "toggle":
        send_enabled = not send_enabled
        if send_enabled:
            send_just_enabled = True
            print("SEND: ON (sync de pausa pendiente)")
        else:
            print("SEND: OFF (acumulando energía local)")

    elif evt == "reset":
        energy_total_wh = 0.0
        paused_energy_wh = 0.0
        send_just_enabled = False
        print("ENERGY RESET -> 0 Wh (total y pausa)")

def idle_delay(ms_total):
    """
    Espera ms_total, chequeando el botón cada 50ms para no perder pulsaciones.
    """
    end_ms = time.ticks_add(time.ticks_ms(), ms_total)
    while time.ticks_diff(end_ms, time.ticks_ms()) > 0:
        now_ms = time.ticks_ms()
        evt = button_update(now_ms)
        if evt is not None:
            handle_button_event(evt)
        time.sleep_ms(50)

# --- INA219 ---
I2C_ADDR = 0x41
R_SHUNT_OHMS = 0.10

REG_CONFIG = 0x00
REG_SHUNT_V = 0x01
REG_BUS_V = 0x02

i2c = I2C(0, scl=Pin(22), sda=Pin(21), freq=400000)

def read_u16(reg):
    b = i2c.readfrom_mem(I2C_ADDR, reg, 2)
    return (b[0] << 8) | b[1]

def read_s16(reg):
    v = read_u16(reg)
    if v & 0x8000:
        v -= 65536
    return v

def ina_init():
    i2c.writeto_mem(I2C_ADDR, REG_CONFIG, bytes([0x39, 0x9F]))

def ina_read():
    shunt_raw = read_s16(REG_SHUNT_V)
    bus_raw = read_u16(REG_BUS_V)

    shunt_v = shunt_raw * 0.00001
    bus_v = (bus_raw >> 3) * 0.004

    current_a = shunt_v / R_SHUNT_OHMS
    power_w = bus_v * current_a
    return bus_v, current_a, power_w

def wifi_connect():
    wlan = network.WLAN(network.STA_IF)
    try:
        if wlan.active() and not wlan.isconnected():
            wlan.disconnect()
            wlan.active(False)
            time.sleep_ms(200)
    except Exception:
        pass

    wlan.active(True)

    if not wlan.isconnected():
        print("Conectando WiFi...")
        try:
            wlan.connect(SSID, PASS)
        except OSError:
            wlan.active(False)
            time.sleep_ms(200)
            wlan.active(True)
            wlan.connect(SSID, PASS)
        t0 = time.ticks_ms()
        while not wlan.isconnected():
            if time.ticks_diff(time.ticks_ms(), t0) > 20000:
                raise RuntimeError("Timeout WiFi")
            time.sleep(0.2)

    print("WiFi OK:", wlan.ifconfig())
    return wlan

def ensure_wifi(wlan):
    if wlan and wlan.isconnected():
        return wlan
    print("WiFi caido. Reintentando...")
    return wifi_connect()

def post_measurement(v, i, p, e_wh):
    payload = {
        "voltage": round(v, 3),
        "current": round(i, 6),
        "power": round(p, 3),
        "energy_wh": round(e_wh, 6),
        # timestamps
        "ts_utc": iso_utc(),
        "ts_ar": iso_ar(),
    }
    headers = {"Content-Type": "application/json", "X-API-Key": API_KEY}

    for attempt in range(2):
        r = None
        try:
            r = urequests.post(URL, data=ujson.dumps(payload), headers=headers)
            print("HTTP", r.status_code, r.text)
            return r.status_code
        except Exception as e:
            print("POST error:", e)
            if attempt == 0:
                time.sleep(0.5)
                continue
            return None
        finally:
            if r is not None:
                r.close()

# -------- LED helpers ----------
RED_BLINK_EVERY_MS = 250
_last_red_blink = time.ticks_ms()
_red_blink_on = False

def red_off():
    global _red_blink_on
    _red_blink_on = False
    led_red.off()

def red_on():
    global _red_blink_on
    _red_blink_on = True
    led_red.on()

def red_blink_tick(now_ms):
    global _last_red_blink, _red_blink_on
    if time.ticks_diff(now_ms, _last_red_blink) > RED_BLINK_EVERY_MS:
        _red_blink_on = not _red_blink_on
        led_red.value(1 if _red_blink_on else 0)
        _last_red_blink = now_ms

GREEN_BLINK_EVERY_MS = 300
_last_green_blink = time.ticks_ms()
_green_blink_on = False

def green_blink_tick(now_ms):
    global _last_green_blink, _green_blink_on
    if time.ticks_diff(now_ms, _last_green_blink) > GREEN_BLINK_EVERY_MS:
        _green_blink_on = not _green_blink_on
        led_green.value(1 if _green_blink_on else 0)
        _last_green_blink = now_ms

# --- MAIN ---
wlan = wifi_connect()

# Sync horario (UTC) y conversión a AR
sync_time_utc()
last_ntp_sync_ms = time.ticks_ms()
NTP_RESYNC_EVERY_MS = 6 * 60 * 60 * 1000  # 6 horas

# Validación sensor al inicio (si falla => rojo fijo y no arranca)
try:
    ina_init()
    red_off()
except Exception as e:
    print("INA219 init error:", e)
    red_on()
    while True:
        idle_delay(1000)

INTERVAL_S = 2
last_ms = time.ticks_ms()

# Server OK basado en POST (para LED verde)
server_ok = False

while True:
    now_ms = time.ticks_ms()

    # Re-sync NTP cada 6 horas (si hay WiFi)
    if time.ticks_diff(now_ms, last_ntp_sync_ms) > NTP_RESYNC_EVERY_MS:
        try:
            if wlan and wlan.isconnected():
                if sync_time_utc():
                    last_ntp_sync_ms = now_ms
        except Exception:
            pass

    # Chequeo botón al inicio del ciclo
    evt = button_update(now_ms)
    if evt is not None:
        handle_button_event(evt)

    # dt para energía
    dt_s = time.ticks_diff(now_ms, last_ms) / 1000.0
    last_ms = now_ms

    try:
        # 1) WiFi
        wlan = ensure_wifi(wlan)
        wifi_ok = wlan.isconnected()

        if not wifi_ok:
            server_ok = False
            led_green.off()
            red_off()
            idle_delay(int(INTERVAL_S * 1000))
            continue

        # 2) Sensor: si no responde => rojo fijo
        try:
            v, i, p = ina_read()
        except Exception as e:
            print("INA219 read error:", e)
            led_green.off()
            red_on()
            idle_delay(int(INTERVAL_S * 1000))
            continue

        # 3) Energía incremental + acumulada
        e_wh = p * (dt_s / 3600.0)
        energy_total_wh += e_wh

        # Si SEND OFF, acumulamos pausa
        if not send_enabled:
            paused_energy_wh += e_wh

        print(
            "AR:", iso_ar(),
            "| V/I/P:", v, i, p,
            "| E_wh:", e_wh,
            "| E_total_wh:", energy_total_wh,
            "| paused_wh:", paused_energy_wh,
            "| SEND:", "ON" if send_enabled else "OFF"
        )

        # 4) Si SEND OFF: no posteamos, verde y rojo apagados
        if not send_enabled:
            led_green.off()
            red_off()
            idle_delay(int(INTERVAL_S * 1000))
            continue

        # SEND ON: verde fijo si server OK, si no titila
        if server_ok:
            led_green.on()
        else:
            green_blink_tick(now_ms)

        # 5) POST con sync si corresponde
        e_wh_to_send = e_wh
        syncing = False

        if send_just_enabled and paused_energy_wh > 0.0:
            e_wh_to_send = paused_energy_wh + e_wh
            syncing = True
            print("SYNC pendiente -> enviando energy_wh:", e_wh_to_send)

        status = post_measurement(v, i, p, e_wh_to_send)

        if status is not None and 200 <= status < 300:
            server_ok = True
            led_green.on()
            red_off()

            # ✅ Sync confirmado: recién acá borramos pausa
            if syncing:
                paused_energy_wh = 0.0
                send_just_enabled = False
                print("SYNC OK -> pausa limpiada")
        else:
            server_ok = False
            red_blink_tick(time.ticks_ms())
            # no borramos paused_energy_wh, se reintenta

    except Exception as e:
        print("Error:", e)
        server_ok = False
        red_blink_tick(time.ticks_ms())

    idle_delay(int(INTERVAL_S * 1000))