# EcoWatt — Informe Final: Arquitectura Web del Sistema IoT de Monitoreo Energético

**Asignatura:** Arquitectura Web  
**Proyecto:** Sistema de Monitoreo de Consumo Energético con IoT  
**Autor:** Tomas Sisterna  

---

## Índice

1. [Descripción general del proyecto](#1-descripción-general-del-proyecto)
2. [Arquitectura del sistema](#2-arquitectura-del-sistema)
3. [Capa de hardware: ESP32 e INA219](#3-capa-de-hardware-esp32-e-ina219)
4. [Thonny: herramienta de desarrollo del firmware](#4-thonny-herramienta-de-desarrollo-del-firmware)
5. [Firmware MicroPython](#5-firmware-micropython)
6. [Backend: API REST con Flask y SQLite](#6-backend-api-rest-con-flask-y-sqlite)
7. [Frontend: Next.js, React y TypeScript](#7-frontend-nextjs-react-y-typescript)
8. [Autenticación: Supabase y Google OAuth](#8-autenticación-supabase-y-google-oauth)
9. [Flujo completo extremo a extremo](#9-flujo-completo-extremo-a-extremo)
10. [Modelo de datos](#10-modelo-de-datos)
11. [Endpoints de la API](#11-endpoints-de-la-api)
12. [Dashboard y visualización](#12-dashboard-y-visualización)
13. [Exportaciones CSV](#13-exportaciones-csv)
14. [Planes de servicio](#14-planes-de-servicio)
15. [Seguridad del sistema](#15-seguridad-del-sistema)
16. [Dispositivos de demostración](#16-dispositivos-de-demostración)

---

## 1. Descripción general del proyecto

EcoWatt es una plataforma de monitoreo de consumo energético basada en IoT. El objetivo del sistema es medir el consumo eléctrico por dispositivo en tiempo real, almacenar el historial de mediciones y ofrecer al usuario un dashboard web con gráficos, alertas y exportaciones.

El problema que resuelve es la falta de visibilidad granular en el consumo eléctrico: la factura del proveedor de energía muestra únicamente el total mensual, sin distinguir qué electrodoméstico o equipo consume más. EcoWatt permite identificar dispositivos de alto consumo, comparar períodos y recibir alertas cuando se supera un umbral definido.

### Stack tecnológico

| Capa | Tecnología |
|---|---|
| Hardware / Sensor | ESP32 + INA219 + LEDs + botón físico |
| Firmware | MicroPython |
| Herramienta de desarrollo firmware | Thonny IDE |
| Sincronización horaria | NTP (ntptime) |
| Backend / API | Python 3, Flask, SQLite |
| Frontend / Dashboard | Next.js 16, React 19, TypeScript |
| Autenticación web | Supabase (Google OAuth 2.0) |

---

## 2. Arquitectura del sistema

El sistema se organiza en tres capas principales que se comunican de forma secuencial:

```
┌─────────────────────────────────────────────────────────────────┐
│                        CAPA DE HARDWARE                         │
│                                                                 │
│   INA219 ──(I2C)──► ESP32 ──(Wi-Fi HTTP POST)──► Backend       │
│  (sensor)          (microcontrolador)                           │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CAPA DE BACKEND                            │
│                                                                 │
│   Flask (API REST) ──► SQLite (base de datos)                   │
│   Puerto 5000                                                   │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CAPA DE FRONTEND                           │
│                                                                 │
│   Next.js (Puerto 3000) ──► /api/* ──► Backend :5000            │
│   Dashboard, Planes, Checkout, Login (Supabase)                 │
└─────────────────────────────────────────────────────────────────┘
```

**Comunicación entre capas:**

- **ESP32 → Backend:** HTTP POST en red local (Wi-Fi), con autenticación por header `X-API-Key`.
- **Frontend → Backend:** el navegador hace peticiones a `/api/*` que Next.js reescribe automáticamente hacia `http://127.0.0.1:5000/api/*` mediante un proxy configurado en `next.config.ts`.
- **Frontend → Supabase:** HTTPS para el flujo de autenticación OAuth con Google.

---

## 3. Capa de hardware: ESP32 e INA219

### 3.1 ESP32

El ESP32 es un microcontrolador de bajo costo fabricado por Espressif Systems. Sus características principales para este proyecto son:

- Procesador Xtensa dual-core de 240 MHz.
- Wi-Fi 802.11 b/g/n integrado (sin necesidad de módulo externo).
- Soporte para MicroPython como lenguaje de firmware.
- Periféricos I2C, SPI, UART, GPIO y ADC.

En el sistema actúa como el nodo IoT: lee los datos del sensor por I2C, calcula la energía consumida y los envía por Wi-Fi al backend cada cierto intervalo de tiempo.

### 3.2 INA219

El INA219 es un sensor de corriente y voltaje de Texas Instruments que se comunica por protocolo I2C.

**¿Qué mide?**

- **Voltaje de shunt (V_shunt):** tensión en un resistor de baja resistencia colocado en serie con la carga. Permite calcular la corriente.
- **Voltaje de bus (V_bus):** tensión de la carga eléctrica medida (voltaje de línea).

**¿Cómo se calculan las magnitudes?**

A partir de las lecturas crudas del INA219 se calculan:

```
corriente (A) = voltaje_shunt (V) / resistencia_shunt (Ω)
potencia (W)  = voltaje_bus (V) × corriente (A)
energía (Wh)  = potencia (W) × tiempo_transcurrido (h)
```

**Conexión ESP32 ↔ INA219 (I2C):**

| INA219 | ESP32 |
|---|---|
| SDA | GPIO 21 |
| SCL | GPIO 22 |
| VCC | 3.3 V |
| GND | GND |

La dirección I2C del sensor en este proyecto es `0x41` (configurable por hardware mediante los pines A0/A1 del INA219).

El resistor de shunt utilizado tiene un valor de **0.10 Ω** (`R_SHUNT_OHMS = 0.10`), que define la sensibilidad de medición de corriente.

---

## 4. Thonny: herramienta de desarrollo del firmware

### 4.1 ¿Qué es Thonny?

Thonny es un entorno de desarrollo integrado (IDE) diseñado especialmente para Python y MicroPython. Es la herramienta utilizada en este proyecto para escribir, depurar y cargar el firmware en el ESP32.

**Características principales:**

- Interfaz simple con resaltado de sintaxis para Python.
- Soporte nativo para MicroPython en placas como ESP32, ESP8266 y Raspberry Pi Pico.
- Terminal interactiva (REPL) integrada: permite ejecutar comandos directamente en el ESP32.
- Explorador de archivos del microcontrolador: muestra y gestiona los archivos almacenados en la memoria flash del ESP32.
- Instalación de MicroPython en el dispositivo con un solo clic.

### 4.2 Flujo de trabajo con Thonny

El proceso completo para llevar el firmware al ESP32 mediante Thonny es el siguiente:

**Paso 1 — Instalar MicroPython en el ESP32**

La primera vez, Thonny permite flashear (grabar) el firmware de MicroPython en la memoria del ESP32:

1. Conectar el ESP32 por USB a la PC.
2. En Thonny: `Herramientas → Opciones → Intérprete`.
3. Seleccionar `MicroPython (ESP32)` y el puerto COM correspondiente.
4. Hacer clic en "Instalar o actualizar MicroPython" y seleccionar el firmware descargado.

**Paso 2 — Escribir y probar código en el REPL**

El REPL (Read-Eval-Print Loop) de Thonny es un terminal interactivo que se ejecuta directamente en el ESP32. Permite escribir instrucciones Python línea por línea y ver el resultado inmediatamente. Por ejemplo:

```python
>>> from machine import I2C, Pin
>>> i2c = I2C(0, scl=Pin(22), sda=Pin(21), freq=400000)
>>> i2c.scan()
[65]  # 65 decimal = 0x41 → INA219 detectado
```

**Paso 3 — Subir archivos al ESP32**

El ESP32 con MicroPython tiene un sistema de archivos en su memoria flash. Thonny permite copiar archivos desde la PC hacia el dispositivo mediante su explorador de archivos. Los archivos del proyecto cargados son:

- `main.py` → código principal que se ejecuta automáticamente al encender el ESP32.
- `config_local.py` → configuración local (SSID, contraseña Wi-Fi, API Key, IP del servidor).

**Paso 4 — Ejecutar y monitorear**

Una vez cargados los archivos, al reiniciar el ESP32 (o presionar el botón RESET) `main.py` se ejecuta automáticamente. La consola de Thonny muestra la salida en tiempo real:

```
Conectando WiFi...
WiFi OK: ('192.168.1.105', '255.255.255.0', ...)
V/I/P: 220.1 1.42 312.5 E_wh: 0.000174
HTTP 201 {"ok": true, "ts": "2026-07-09T14:23:01Z"}
```

### 4.3 Rol de Thonny en la arquitectura

Thonny es exclusivamente una **herramienta de desarrollo en la PC** y no forma parte del sistema en producción. Una vez que los archivos `main.py` y `config_local.py` están cargados en el ESP32, el microcontrolador opera de forma completamente autónoma: lee el sensor, calcula la energía y envía los datos al backend sin necesidad de tener Thonny conectado.

```
[Thonny en PC] ──(USB, solo en desarrollo)──► [ESP32]
                                                  │
                                        (en producción, autónomo)
                                                  │
                                                  ▼
                                            [Backend Flask]
```

---

## 5. Firmware MicroPython

El firmware es el programa que corre dentro del ESP32. Está escrito en MicroPython (`main.py`) y es la versión final de producción del sistema.

### 5.1 Componentes de hardware del nodo IoT

Además del ESP32 y el INA219, el nodo físico incorpora:

| Componente | GPIO | Función |
|---|---|---|
| INA219 (SDA) | GPIO 21 | Bus I2C — datos del sensor |
| INA219 (SCL) | GPIO 22 | Bus I2C — reloj |
| LED verde | GPIO 23 | Indica estado de WiFi y servidor |
| LED rojo | GPIO 25 | Indica errores o envío pausado |
| Botón físico | GPIO 27 | Control manual (toggle / reset) |

### 5.2 Responsabilidades del firmware

El firmware final tiene seis responsabilidades:

1. **Conectarse a Wi-Fi** y reconectarse automáticamente si la conexión cae.
2. **Sincronizar la hora** por NTP al iniciar y cada 6 horas, convirtiendo UTC a hora Argentina (UTC-3).
3. **Leer el INA219** por I2C: voltaje, corriente y potencia.
4. **Calcular la energía incremental** en cada ciclo.
5. **Controlar los LEDs** para señalizar el estado del sistema visualmente.
6. **Enviar las mediciones** al backend por HTTPS POST, con lógica de pausa, acumulación y sincronización.

### 5.3 Sincronización horaria con NTP

El ESP32 sincroniza su reloj interno con un servidor NTP (Network Time Protocol) al arrancar:

```python
import ntptime

ARG_OFFSET_S = -3 * 3600   # Argentina = UTC-3

def sync_time_utc():
    ntptime.settime()   # Fija el RTC interno del ESP32 en UTC

def iso_utc():
    return iso_from_localtime(time.localtime()) + "Z"

def iso_ar():
    # Aplica el offset de -3 horas para hora local argentina
    return iso_from_localtime(time.localtime(time.time() + ARG_OFFSET_S))
```

Cada medición enviada al backend incluye **dos timestamps**:
- `ts_utc`: hora UTC (para que el backend la almacene de forma estándar)
- `ts_ar`: hora Argentina (para mostrársela al usuario)

La resincronización NTP se repite automáticamente **cada 6 horas** durante el funcionamiento para evitar desvíos en el reloj.

### 5.4 LEDs de estado

El sistema usa dos LEDs para dar feedback visual sin necesidad de conectar una PC:

| LED | Estado | Significado |
|---|---|---|
| Verde fijo | — | Último POST al servidor fue exitoso (2xx) |
| Verde parpadeando | — | WiFi conectado pero servidor sin confirmar |
| Verde apagado | — | Sin WiFi o envío pausado (SEND OFF) |
| Rojo fijo | — | Error grave: sensor INA219 no responde |
| Rojo parpadeando | — | Error en POST (falla de red o servidor) |
| Rojo apagado | — | Funcionamiento normal |

```python
LED_GREEN_GPIO = 23
LED_RED_GPIO   = 25

led_green = Pin(LED_GREEN_GPIO, Pin.OUT)
led_red   = Pin(LED_RED_GPIO,   Pin.OUT)
```

### 5.5 Botón físico: control manual

El botón conectado al GPIO 27 permite controlar el dispositivo sin PC. Implementa **debounce por software** y detecta dos tipos de pulsación:

| Tipo | Duración | Acción |
|---|---|---|
| Pulsación corta | < 1200 ms | Toggle SEND ON/OFF |
| Pulsación larga | ≥ 1200 ms | Reset del contador de energía acumulada a 0 |

**¿Para qué sirve el toggle SEND OFF?**

Cuando el envío está desactivado, el ESP32 sigue midiendo y **acumula localmente** la energía consumida en `paused_energy_wh`. Al reactivar el envío, el siguiente POST incluye toda la energía acumulada durante la pausa, garantizando que no se pierda ninguna medición.

```python
# Pulsación corta -> toggle
if evt == "toggle":
    send_enabled = not send_enabled
    if send_enabled:
        send_just_enabled = True   # indica que hay sync pendiente

# Pulsación larga -> reset
elif evt == "reset":
    energy_total_wh = 0.0
    paused_energy_wh = 0.0
```

### 5.6 Lectura del INA219 y cálculo de energía

```python
def ina_read():
    shunt_raw = read_s16(REG_SHUNT_V)      # 10 µV/bit
    bus_raw   = read_u16(REG_BUS_V)        # 4 mV/bit (shift 3 bits)

    shunt_v   = shunt_raw * 0.00001        # → voltios de shunt
    bus_v     = (bus_raw >> 3) * 0.004     # → voltios de línea

    current_a = shunt_v / R_SHUNT_OHMS    # I = V / R  (Ley de Ohm)
    power_w   = bus_v * current_a          # P = V × I
    return bus_v, current_a, power_w
```

En cada ciclo se calcula la energía incremental a partir del tiempo transcurrido:

```python
dt_s  = time.ticks_diff(now_ms, last_ms) / 1000.0   # segundos desde el ciclo anterior
e_wh  = power_w * (dt_s / 3600.0)                    # E = P × t  (en horas)
energy_total_wh += e_wh                               # acumulado desde el último reset
```

### 5.7 Envío de mediciones al backend

Las mediciones se envían a la URL de producción por HTTPS con 2 reintentos ante fallo:

```python
URL = "https://ecowatt.ar/api/v1/measurements"

def post_measurement(v, i, p, e_wh):
    payload = {
        "voltage":   round(v, 3),
        "current":   round(i, 6),
        "power":     round(p, 3),
        "energy_wh": round(e_wh, 6),
        "ts_utc":    iso_utc(),   # timestamp UTC
        "ts_ar":     iso_ar(),    # timestamp Argentina
    }
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
    }
    for attempt in range(2):
        try:
            r = urequests.post(URL, data=ujson.dumps(payload), headers=headers)
            return r.status_code
        except Exception:
            if attempt == 0:
                time.sleep(0.5)   # espera breve antes del segundo intento
```

**Lógica de sincronización tras pausa:**

```python
# Si el envío acaba de reactivarse y hay energía acumulada, se manda todo junto
if send_just_enabled and paused_energy_wh > 0.0:
    e_wh_to_send = paused_energy_wh + e_wh   # acumulada + la del ciclo actual

status = post_measurement(v, i, p, e_wh_to_send)

if status es 2xx:
    paused_energy_wh = 0.0      # recién aquí se limpia la pausa
    send_just_enabled = False
# Si falla, paused_energy_wh se conserva y se reintenta en el próximo ciclo
```

### 5.8 Bucle principal resumido

```
Arranque:
  1. wifi_connect()
  2. sync_time_utc()
  3. ina_init()  → si falla: LED rojo fijo, cuelga

Loop (cada 2 segundos):
  1. Re-sync NTP si pasaron 6 horas
  2. Leer botón → manejar toggle/reset
  3. Calcular dt_s
  4. ensure_wifi() → reconectar si cayó
  5. ina_read() → si falla: LED rojo fijo, skip ciclo
  6. Calcular e_wh y energy_total_wh
  7. Si SEND OFF: acumular paused_energy_wh, skip POST
  8. post_measurement() con sync si corresponde
  9. Actualizar LEDs según resultado del POST
 10. idle_delay(2000ms) chequeando el botón cada 50ms
```

### 5.9 Credenciales del firmware

Las credenciales están directamente en `main.py` (en la sección CONFIG al inicio del archivo) y **no se suben al repositorio**:

```python
SSID    = "NombreDeRedWiFi"
PASS    = "ContraseñaWiFi"
API_KEY = "clave_obtenida_al_crear_el_dispositivo"
```

---

## 6. Backend: API REST con Flask y SQLite

### 6.1 Descripción

El backend es una API REST implementada en Python con el framework Flask. Se ejecuta en el puerto 5000 y es responsable de:

- Recibir y validar las mediciones del ESP32.
- Gestionar el registro de dispositivos.
- Calcular estadísticas y métricas mensuales.
- Exponer los datos al frontend mediante endpoints JSON y CSV.

**Ubicación:** `backend/app/`

**Archivos principales:**

| Archivo | Responsabilidad |
|---|---|
| `__main__.py` | Punto de entrada; levanta el servidor Flask |
| `routes.py` | Definición de todos los endpoints de la API |
| `db.py` | Gestión de la conexión a SQLite |
| `config.py` | Carga de variables de entorno (`DB_PATH`, `APP_SECRET`) |
| `schema.sql` | Definición del esquema de la base de datos |

### 6.2 Cómo levantar el backend

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate     # Windows
pip install -r requirements.txt
python -m app
```

El servidor queda disponible en `http://127.0.0.1:5000`.

### 6.3 Base de datos: SQLite

Se utiliza SQLite como motor de base de datos, almacenado en un único archivo (`backend/data/sisterna.sqlite`). Es una solución ligera apropiada para el prototipo, sin necesidad de servidor de base de datos separado.

**Esquema (`schema.sql`):**

```sql
CREATE TABLE IF NOT EXISTS devices (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  name                 TEXT NOT NULL,
  api_key              TEXT NOT NULL UNIQUE,   -- clave de autenticación del dispositivo
  monthly_threshold_wh REAL DEFAULT 0,          -- umbral de alerta mensual en Wh
  created_at           TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS measurements (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id  INTEGER NOT NULL,
  ts         TEXT NOT NULL,      -- timestamp ISO-8601 (UTC)
  voltage    REAL,               -- voltios
  current    REAL,               -- amperes
  power      REAL,               -- vatios
  energy_wh  REAL NOT NULL,      -- energía incremental en Wh (obligatorio)
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(device_id) REFERENCES devices(id)
);

-- Índice para acelerar consultas por dispositivo y fecha
CREATE INDEX IF NOT EXISTS idx_measurements_device_ts
ON measurements(device_id, ts);
```

**Relación entre tablas:**

```
devices (1) ──────────────────── (N) measurements
  id ◄─────────────────────────── device_id
  name
  api_key         ← usada por el ESP32 para autenticarse
  monthly_threshold_wh  ← umbral para generar alertas
```

---

## 7. Frontend: Next.js, React y TypeScript

### 7.1 Descripción

El frontend es una aplicación web construida con Next.js 16 utilizando el App Router. Corre en el puerto 3000 y ofrece tanto páginas públicas (marketing, planes, checkout) como el dashboard privado para usuarios autenticados.

**Ubicación:** `frontend/`

**Tecnologías:**

- **Next.js 16 (App Router):** framework React con renderizado híbrido (SSR/CSR), enrutamiento basado en carpetas y soporte para Route Handlers en el servidor.
- **React 19:** librería de componentes para la UI.
- **TypeScript:** tipado estático para mayor robustez.
- **Chart.js + react-chartjs-2:** visualización de datos en el dashboard.

### 7.2 Páginas implementadas

| Ruta | Archivo | Descripción |
|---|---|---|
| `/` | `app/page.tsx` | Página de inicio (landing) |
| `/planes` | `app/planes/page.tsx` | Comparación de planes |
| `/planes/basico` | `app/planes/basico/page.tsx` | Detalle plan básico |
| `/planes/avanzado` | `app/planes/avanzado/page.tsx` | Detalle plan avanzado |
| `/planes/premium` | `app/planes/premium/page.tsx` | Detalle plan premium |
| `/checkout` | `app/checkout/page.tsx` | Proceso de compra |
| `/carrito` | `app/carrito/page.tsx` | Carrito de compras |
| `/dashboard` | `app/dashboard/page.tsx` | Dashboard de monitoreo |
| `/auth/callback` | `app/auth/callback/route.ts` | Callback OAuth de Supabase |

### 7.3 Proxy de API (next.config.ts)

Una característica importante de la arquitectura es que el frontend actúa como proxy hacia el backend. Esto está configurado en `frontend/next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:5000/api/:path*",
      },
    ];
  },
};
```

**¿Por qué es útil este proxy?**

- El navegador siempre llama a la misma origen (`localhost:3000`), evitando problemas de CORS.
- En producción se puede cambiar solo la URL de destino sin modificar el código del frontend.
- El frontend y el backend son independientes pero se presentan al usuario como un solo sistema.

### 7.4 Cómo levantar el frontend

```bash
cd frontend
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:3000`.

---

## 8. Autenticación: Supabase y Google OAuth

### 8.1 ¿Qué es Supabase?

Supabase es una plataforma Backend-as-a-Service (BaaS) de código abierto. En este proyecto se utiliza exclusivamente para la autenticación de usuarios web, implementando el flujo OAuth 2.0 con Google como proveedor de identidad.

### 8.2 Flujo de autenticación (OAuth 2.0 con Google)

```
Usuario hace clic en "Login con Google"
        │
        ▼
Frontend (Next.js)
  supabase.auth.signInWithOAuth({ provider: 'google' })
        │
        ▼
Supabase Auth Server
  Genera URL de autorización de Google
        │
        ▼
Google OAuth
  Usuario ingresa credenciales y autoriza
  Google genera un código de autorización
        │
        ▼
Callback: GET /auth/callback?code=XXXX
  (manejado por Next.js Route Handler)
        │
        ▼
supabase.auth.exchangeCodeForSession(code)
  Supabase canjea el código por un token de sesión
        │
        ▼
Redirección a /dashboard
  Usuario autenticado
```

### 8.3 Implementación del callback

El archivo `frontend/app/auth/callback/route.ts` es un Route Handler de Next.js que gestiona el retorno de Google:

```typescript
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/?auth_error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/?auth_error=exchange_failed`);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
```

### 8.4 Variables de entorno necesarias

Para que el login con Google funcione se requiere configurar en `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 9. Flujo completo extremo a extremo

Este es el recorrido completo de un dato desde que el sensor lo mide hasta que el usuario lo ve en el dashboard:

```
① ESP32 + INA219
   Al arrancar: conecta WiFi, sincroniza hora por NTP.
   Cada 2 segundos: lee INA219 por I2C.
   Calcula: corriente (I=V/R), potencia (P=V×I),
            energía incremental (E=P×Δt/3600).

       │  HTTPS POST  →  https://ecowatt.ar/api/v1/measurements
       │  Header: X-API-Key: <clave_del_dispositivo>
       │  Body:
       │  {
       │    "voltage": 220.1,
       │    "current": 1.42,
       │    "power": 312.5,
       │    "energy_wh": 0.000174,
       │    "ts_utc": "2026-07-09T14:23:01Z",
       │    "ts_ar": "2026-07-09 11:23:01"
       │  }
       ▼

② Backend Flask (https://ecowatt.ar, puerto 5000)
   1. Lee el header X-API-Key.
   2. Busca el device en SQLite por esa api_key.
   3. Si no existe → 403 Forbidden.
   4. Si existe → inserta en measurements con el ts recibido.
   5. Responde: { "ok": true, "ts": "2026-07-09T14:23:01Z" }

   LED verde fijo en el ESP32 al recibir 2xx.
   LED rojo parpadeando si falla o no hay respuesta.

       │  (los datos quedan en SQLite)
       ▼

③ Base de datos SQLite
   Tabla measurements: nueva fila con
   device_id, ts, voltage, current, power, energy_wh.

       │  (cuando el usuario abre el dashboard)
       ▼

④ Frontend Next.js (https://ecowatt.ar:3000 / localhost:3000)
   El navegador hace fetch a:
     /api/v1/metrics/summary_month?month=2026-07
     /api/v1/export/daily.csv?month=2026-07&device_id=1
   Next.js (next.config.ts) reescribe /api/* → backend.

       ▼

⑤ Visualización en el navegador
   El dashboard muestra:
   - Total del mes en kWh.
   - Gráfico de consumo diario (línea) por dispositivo.
   - Gráfico semanal y mensual (barras).
   - Comparativo entre dispositivos (plan Premium).
   - Alertas si se superó el umbral mensual.
   - Botón de exportar CSV.
```

---

## 10. Modelo de datos

### Tabla `devices`

Cada ESP32 registrado en el sistema tiene una entrada en esta tabla. La `api_key` es la credencial que el firmware usa para autenticarse.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Identificador único |
| `name` | TEXT | Nombre del dispositivo (ej: "Medidor Sala") |
| `api_key` | TEXT UNIQUE | Clave secreta generada al crear el dispositivo |
| `monthly_threshold_wh` | REAL | Umbral de consumo mensual para alertas (en Wh) |
| `created_at` | TEXT | Fecha de creación (UTC) |

### Tabla `measurements`

Cada medición enviada por el ESP32 genera un registro en esta tabla.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Identificador único |
| `device_id` | INTEGER FK | Referencia al dispositivo |
| `ts` | TEXT | Timestamp ISO-8601 UTC (ej: "2026-07-09T14:23:01Z") |
| `voltage` | REAL | Voltaje de línea (V) — opcional |
| `current` | REAL | Corriente (A) — opcional |
| `power` | REAL | Potencia instantánea (W) — opcional |
| `energy_wh` | REAL | Energía incremental (Wh) — **obligatorio** |
| `created_at` | TEXT | Fecha de inserción (UTC) |

---

## 11. Endpoints de la API

Todos los endpoints tienen el prefijo `/api/v1`.

### Gestión de dispositivos

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/devices` | Crea un dispositivo; devuelve la `api_key` |
| `GET` | `/devices` | Lista todos los dispositivos |
| `PATCH` | `/devices/{id}` | Edita nombre o umbral de un dispositivo |
| `DELETE` | `/devices/{id}` | Elimina un dispositivo y sus mediciones |

**Ejemplo — Crear dispositivo:**

```http
POST /api/v1/devices
Content-Type: application/json

{
  "name": "Medidor Cocina",
  "monthly_threshold_wh": 25000
}
```

Respuesta:

```json
{
  "id": 1,
  "name": "Medidor Cocina",
  "api_key": "fef48db58d6167f3919c952e5d75a199",
  "monthly_threshold_wh": 25000
}
```

La `api_key` solo se devuelve al momento de la creación. Debe guardarse para configurar el firmware del ESP32.

---

### Ingesta de mediciones (ESP32 → API)

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/measurements` | Recibe una medición del ESP32 |

**Autenticación:** header `X-API-Key: <clave_del_dispositivo>`

**Ejemplo de request (enviado por el ESP32):**

```http
POST /api/v1/measurements
Content-Type: application/json
X-API-Key: fef48db58d6167f3919c952e5d75a199

{
  "voltage": 220.1,
  "current": 1.420000,
  "power": 312.5,
  "energy_wh": 0.000174,
  "ts_utc": "2026-07-09T14:23:01Z",
  "ts_ar": "2026-07-09 11:23:01"
}
```

- `energy_wh` es el **único campo obligatorio**.
- `ts_utc` y `ts_ar` son enviados por el firmware (sincronizados por NTP). Si no vienen, el backend genera el timestamp UTC automáticamente.
- `voltage`, `current` y `power` son opcionales pero siempre se envían en la versión final.

Respuesta:

```json
{
  "ok": true,
  "ts": "2026-07-09T14:23:01Z"
}
```

---

### Métricas (Dashboard → API)

| Método | Endpoint | Parámetros | Descripción |
|---|---|---|---|
| `GET` | `/metrics/summary_month` | `month=YYYY-MM`, `device_id` (opcional) | Resumen mensual total y por dispositivo |
| `GET` | `/metrics/daily` | `device_id`, `from=YYYY-MM-DD`, `to=YYYY-MM-DD` | Consumo diario en un rango |

**Ejemplo — Resumen mensual:**

```
GET /api/v1/metrics/summary_month?month=2026-07
```

Respuesta:

```json
{
  "month": "2026-07",
  "month_total_wh": 45230.5,
  "month_total_kwh": 45.23,
  "month_measurements": 1240,
  "devices": [
    {
      "id": 1,
      "name": "Medidor Cocina",
      "energy_kwh": 28.5,
      "avg_power": 312.1,
      "max_power": 1800.0,
      "avg_voltage": 220.3,
      "avg_current": 1.42
    }
  ],
  "alerts": [
    {
      "device_id": 1,
      "device_name": "Medidor Cocina",
      "energy_wh": 28500,
      "threshold_wh": 25000,
      "type": "MONTHLY_THRESHOLD_EXCEEDED"
    }
  ]
}
```

---

### Exportaciones CSV

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/export/measurements.csv` | Todas las mediciones del mes |
| `GET` | `/export/daily.csv` | Consumo diario agrupado |
| `GET` | `/export/alerts.csv` | Dispositivos que superaron el umbral |

---

## 12. Dashboard y visualización

El dashboard (`/dashboard`) es la vista central del sistema. Está implementado como un componente React del lado del cliente (`"use client"`) y hace todos sus fetches directamente desde el navegador.

### 12.1 Funcionalidades del dashboard

**Filtros disponibles:**
- Selector de mes (`YYYY-MM`).
- Selector de dispositivo (individual o "Todos").
- Botón de refresco manual.

**Tarjetas de resumen:**
- Total del mes en kWh.
- Número de mediciones registradas.
- Cantidad de dispositivos activos.

**Gráficos (según plan del usuario):**

| Gráfico | Tipo | Disponible en |
|---|---|---|
| Consumo diario | Línea | Todos los planes |
| Consumo semanal | Barras | Avanzado y Premium |
| Consumo mensual | Barras | Avanzado y Premium |
| Comparativo entre dispositivos | Barras | Solo Premium |

**Alertas:** lista de dispositivos que superaron el umbral mensual, con el excedente en Wh.

### 12.2 Cómo el dashboard obtiene los datos

```typescript
// 1. Carga la lista de dispositivos
fetch("/api/v1/devices")

// 2. Carga el resumen mensual
fetch("/api/v1/metrics/summary_month?month=2026-07")

// 3. Carga los datos diarios en CSV para graficar
fetch("/api/v1/export/daily.csv?month=2026-07&device_id=1")
```

Los datos del CSV diario se parsean en el frontend y se convierten en los datasets de Chart.js para renderizar los gráficos.

---

## 13. Exportaciones CSV

El sistema permite exportar tres tipos de reportes en formato CSV, útiles para análisis externo (Excel, Google Sheets, etc.):

### measurements.csv

Todas las mediciones individuales del mes, una fila por lectura del ESP32:

```
ts,device_id,device_name,voltage,current,power,energy_wh
2026-07-09T14:23:01Z,1,Medidor Cocina,220.1,1.42,312.5,0.000174
```

### daily.csv

Consumo agrupado por día, útil para ver tendencias:

```
day,device_id,device_name,energy_kwh
2026-07-01,1,Medidor Cocina,1.245
2026-07-02,1,Medidor Cocina,0.983
```

### alerts.csv

Dispositivos que superaron el umbral mensual:

```
device_id,device_name,threshold_wh,energy_wh,energy_kwh,exceed_wh,exceed_pct
1,Medidor Cocina,25000,28500.0,28.5,3500.0,14.0
```

---

## 14. Planes de servicio

El sistema implementa un modelo de negocio por suscripción con tres niveles. En el dashboard actual la selección de plan es una simulación que desbloquea funcionalidades de visualización:

| Característica | Básico | Avanzado | Premium |
|---|---|---|---|
| Gráfico diario | ✅ | ✅ | ✅ |
| Gráfico semanal | ❌ | ✅ | ✅ |
| Gráfico mensual | ❌ | ✅ | ✅ |
| Comparativo entre dispositivos | ❌ | ❌ | ✅ |

**Vistas de planes:** `/planes`, `/planes/basico`, `/planes/avanzado`, `/planes/premium`

**Checkout y carrito:** `/checkout` y `/carrito` implementan el flujo de compra.

---

## 15. Seguridad del sistema

### Autenticación del ESP32

Cada dispositivo se autentica con una **API Key** única generada por el backend al momento del registro (`secrets.token_hex(16)`). Esta clave se envía en el header HTTP `X-API-Key` en cada medición. Si la clave no existe en la base de datos, el backend devuelve `403 Forbidden`.

### Autenticación web

Los usuarios del dashboard se autentican con su cuenta de Google mediante el protocolo OAuth 2.0, gestionado por Supabase. El flujo es completamente estándar y no se almacenan contraseñas en el sistema.

### Separación de credenciales

- `config_local.py` (ESP32): no se versiona en git (listado en `.gitignore`).
- `frontend/.env.local` (Supabase): tampoco se versiona.
- `backend/.env` (configuración de Flask): tampoco se versiona.

### CORS y proxy

El frontend actúa como proxy hacia el backend. El navegador nunca hace peticiones directas al puerto 5000; siempre va a `/api/*` en el mismo origen (3000). Esto evita configuraciones CORS complejas y oculta la topología interna del backend.

---

## 16. Dispositivos de demostración

Para la presentación del sistema se cargaron datos simulados en el servidor de producción (`https://ecowatt.ar`) correspondientes a tres meses completos: **Mayo, Junio y Julio 2026**.

### Dispositivos registrados

| ID | Nombre | Perfil de consumo | Mediciones cargadas |
|---|---|---|---|
| 16 | Demo - Bomba de Agua | ~500 W en ventanas de 6-9h, 12-14h y 19-21h | 686 |
| 17 | Demo - Termotanque | ~1500 W de madrugada (4-8h) y noche (20-23h) | 982 |
| 18 | Demo - Lavarropas | ~800-1100 W, ciclos los lunes, miércoles y sábados | 360 |
| 19 | Demo - Iluminación Patio | ~150 W fijos de 18h a 23h todos los días | 1380 |

**Total de mediciones cargadas:** 3409 sobre 3410 generadas (99.97% de éxito).

### Parámetros de generación

- **Período:** 1 de Mayo de 2026 al 9 de Julio de 2026
- **Frecuencia:** una medición cada 15 minutos por dispositivo
- **Campos por medición:** `ts` (UTC), `voltage`, `current`, `power`, `energy_wh`
- **Solo se enviaron mediciones con potencia > 0** (cuando el dispositivo está activo)

### Perfiles de consumo detallados

**Bomba de Agua**
Simula una bomba que se activa por demanda en tres franjas horarias diarias. Dentro de cada ventana tiene una probabilidad del 35% de estar encendida en cada slot de 15 minutos, generando un patrón intermitente realista.

**Termotanque**
Simula el calentamiento de agua antes de los picos de uso (ducha matutina y nocturna). Es el dispositivo con mayor consumo unitario (~1500 W) y mayor cantidad de mediciones porque opera en ventanas amplias con alta probabilidad.

**Lavarropas**
Simula ciclos de lavado completos de 90 minutos, dos veces por día (10h y 15h), los días lunes, miércoles y sábado. El consumo varía dentro del ciclo: calentamiento (~1000 W), lavado (~300 W) y centrifugado (~800 W).

**Iluminación Patio**
Simula iluminación exterior encendida todos los días desde las 18h hasta las 23h, con consumo constante de ~150 W. Es el dispositivo con más mediciones totales por su funcionamiento diario sin interrupciones.

### Cómo se generaron

Los datos fueron generados con el script `tools/seed_demo.py` y enviados directamente a la API de producción usando el endpoint `POST /api/v1/measurements` con la `api_key` de cada dispositivo, exactamente de la misma forma en que lo haría un ESP32 físico.

---

*Fin del informe*
