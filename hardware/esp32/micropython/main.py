import time
import network
from machine import I2C, Pin
import ujson
import urequests

# ---------------- CONFIG ----------------
try:
    from config_local import SSID, PASS, PC_IP, API_KEY, I2C_ADDR, R_SHUNT_OHMS, INTERVAL_S
except ImportError:
    # Fallback seguro para commitear (sin secretos reales)
    SSID = "TU_WIFI"
    PASS = "TU_PASSWORD"
    PC_IP = "192.168.X.Y"
    API_KEY = "TU_API_KEY_COMPLETA"
    I2C_ADDR = 0x41
    R_SHUNT_OHMS = 0.10
    INTERVAL_S = 2

URL = "http://%s:5000/api/v1/measurements" % PC_IP

# ---------------- INA219 ----------------
REG_CONFIG  = 0x00
REG_SHUNT_V = 0x01
REG_BUS_V   = 0x02

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
    # Config continuo, rango típico
    i2c.writeto_mem(I2C_ADDR, REG_CONFIG, bytes([0x39, 0x9F]))

def ina_read():
    shunt_raw = read_s16(REG_SHUNT_V)      # 10uV/bit
    bus_raw   = read_u16(REG_BUS_V)        # 4mV/bit (shift)

    shunt_v = shunt_raw * 0.00001          # V
    bus_v   = (bus_raw >> 3) * 0.004       # V

    current_a = shunt_v / R_SHUNT_OHMS
    power_w   = bus_v * current_a
    return bus_v, current_a, power_w

# ---------------- WIFI + POST ----------------
def wifi_connect():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        print("Conectando WiFi...")
        wlan.connect(SSID, PASS)
        t0 = time.ticks_ms()
        while not wlan.isconnected():
            if time.ticks_diff(time.ticks_ms(), t0) > 20000:
                raise RuntimeError("Timeout WiFi")
            time.sleep(0.2)
    print("WiFi OK:", wlan.ifconfig())
    return wlan

def post_measurement(v, i, p, e_wh):
    payload = {
        "voltage": round(v, 3),
        "current": round(i, 6),
        "power": round(p, 3),
        "energy_wh": round(e_wh, 6),
    }
    headers = {"Content-Type": "application/json", "X-API-Key": API_KEY}
    r = urequests.post(URL, data=ujson.dumps(payload), headers=headers)
    try:
        print("HTTP", r.status_code, r.text)
    finally:
        r.close()

# ---------------- MAIN ----------------
wifi_connect()
ina_init()

last_ms = time.ticks_ms()

while True:
    now_ms = time.ticks_ms()
    dt_s = time.ticks_diff(now_ms, last_ms) / 1000.0
    last_ms = now_ms

    try:
        v, i, p = ina_read()
        e_wh = p * (dt_s / 3600.0)  # energía incremental
        print("V/I/P:", v, i, p, "E_wh:", e_wh)
        post_measurement(v, i, p, e_wh)
    except Exception as e:
        print("Error:", e)

    time.sleep(INTERVAL_S)
