# hardware/esp32/micropython/config_local.example.py
# Copy this file to config_local.py and fill in your actual values
# IMPORTANT: config_local.py is in .gitignore and should NEVER be committed

SSID = "your-wifi-ssid"
PASS = "your-wifi-password"

PC_IP = "192.168.X.Y"          # IP of your PC (the one you use for /health)
API_KEY = "your-api-key-here"  # Generate a secure API key

# INA219
I2C_ADDR = 0x41                # scan returned 65 => 0x41
R_SHUNT_OHMS = 0.10            # R100=0.10, R010=0.01

# Sending interval
INTERVAL_S = 2                 # can increase to 15 or 60 later
