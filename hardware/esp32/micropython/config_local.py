# hardware/esp32/micropython/config_local.py
# NO subir a git: contiene credenciales / keys

SSID = "baco"
PASS = "32791928"

PC_IP = "192.168.X.Y"          # IP de tu PC (la que usás para /health)
API_KEY = "fef48db58d6167f3919c952e5d75a199"

# INA219


I2C_ADDR = 0x41                # scan dio 65 => 0x41
R_SHUNT_OHMS = 0.10            # R100=0.10, R010=0.01

# Envío
INTERVAL_S = 2                 # podés subirlo a 15 o 60 después
