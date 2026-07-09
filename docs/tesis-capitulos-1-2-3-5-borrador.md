# Proyecto IoT de Monitoreo Energetico

## Capitulo 1 - Introduccion

### 1.1 Contexto y motivacion
El Internet de las Cosas (IoT) permite que objetos fisicos se conecten a internet para capturar y transmitir datos en tiempo real. En el ambito energetico, esta capacidad permite medir, analizar y optimizar el consumo electrico en hogares y pymes, favoreciendo la eficiencia energetica y la reduccion de costos.

La propuesta de este trabajo se centra en un sistema que mide consumo por dispositivo, genera estadisticas mensuales y emite alertas cuando se superan umbrales definidos por el usuario.

### 1.2 Problema y oportunidad
El consumo electrico residencial y pyme suele gestionarse de forma global (factura total), sin visibilidad por dispositivo. Esto dificulta:

- detectar patrones de alto consumo;
- comparar consumos entre meses y entre dispositivos;
- tomar decisiones informadas para reducir costos.

La oportunidad es proveer telemetria de bajo costo con ESP32 y una plataforma web que transforme datos en informacion accionable (dashboard, comparativas, alertas y exportaciones CSV).

### 1.3 Objetivo general
Disenar e implementar un sistema IoT (hardware + software) para medir, registrar, analizar y visualizar consumo energetico por dispositivo en hogares o pymes, con reportes mensuales y alertas por umbral.

### 1.4 Objetivos especificos
- Seleccionar y configurar hardware de bajo costo (ESP32 + sensor de corriente/voltaje).
- Desarrollar firmware en MicroPython para lectura de voltaje, corriente, potencia y energia incremental.
- Implementar ingesta por API REST y persistencia centralizada en SQLite.
- Construir interfaz web para visualizacion mensual, comparativas, alertas y exportes CSV.
- Implementar autenticacion de usuarios para acceso web (login con Google via Supabase).
- Disenar y ejecutar pruebas funcionales de extremo a extremo.

### 1.5 Alcance
Incluye:

- Prototipo funcional con ESP32 e INA219 para mediciones electricas.
- Envio de mediciones por Wi-Fi al backend Flask.
- Persistencia de datos en SQLite (`devices`, `measurements`).
- Frontend web con vistas publicas (`/`, `/planes`, `/checkout`, `/carrito`) y dashboard (`/dashboard`).
- Alertas por superacion de umbral mensual y exportes CSV (`measurements`, `daily`, `alerts`).

No incluye:

- Automatizacion activa de cargas (encendido/apagado remoto).
- Integracion con medidores inteligentes de distribuidoras.
- App movil nativa.
- Certificacion de producto industrial.

### 1.6 Supuestos y restricciones
Supuestos:

- Conectividad Wi-Fi local estable.
- Backend Flask operativo en red local para recepcion de datos.
- API key valida por dispositivo para ingesta.

Restricciones:

- Presupuesto acotado y hardware de bajo costo.
- Entorno de desarrollo orientado a tesis y prototipo funcional.
- Escalabilidad moderada (SQLite en entorno local).

### 1.7 Metodologia de trabajo
Se adopto un enfoque iterativo:

- Iteracion 1: relevamiento y prototipo de medicion.
- Iteracion 2: API Flask y persistencia.
- Iteracion 3: dashboard web, login y alertas.
- Iteracion 4: pruebas, ajustes y documentacion final.

### 1.8 Criterios de exito
- Registro correcto de mediciones desde ESP32 hacia API.
- Visualizacion mensual por dispositivo y total.
- Generacion de alertas al superar umbral.
- Exportacion de CSV para analisis.
- Flujo de login funcional en frontend.

---

## Capitulo 2 - Marco teorico

### 2.1 Fundamentos IoT
IoT se estructura en cuatro capas: percepcion (sensores), red (Wi-Fi), procesamiento (API/backend) y aplicacion (dashboard). Esta arquitectura permite trazabilidad y analitica de consumo energetico.

### 2.2 Medicion electrica
El consumo energetico se calcula integrando potencia en el tiempo: E = P * delta_t. En el prototipo se mide voltaje y corriente con INA219; a partir de ello se calcula potencia y energia incremental (`energy_wh`).

### 2.3 Arquitectura aplicada en el proyecto
1. Edge: ESP32 + INA219 + firmware MicroPython.
2. Backend: Flask + SQLite + reglas de negocio.
3. Frontend: Next.js + React + dashboard y vistas comerciales.
4. Autenticacion: Supabase (Google OAuth).

### 2.4 Tecnologias utilizadas
- ESP32: microcontrolador con Wi-Fi integrado.
- INA219: sensor para bus voltage y shunt current.
- MicroPython: firmware rapido de iterar.
- Flask: API REST de ingesta y consulta.
- SQLite: base de datos embebida y liviana.
- Next.js 16 + React 19 + TypeScript: frontend.
- Supabase SSR: login y sesion web.

### 2.5 Comunicacion y seguridad
La comunicacion ESP32-backend usa HTTP POST sobre red local al endpoint `/api/v1/measurements`.

Medidas de seguridad implementadas:
- API key por dispositivo (`X-API-Key`).
- Validacion de payload y tipos en backend.
- Separacion de frontend y backend con reescritura `/api/*`.

### 2.6 Modelo de datos
Tablas principales:
- `devices`: id, nombre, api_key, umbral mensual.
- `measurements`: device_id, timestamp, voltage, current, power, energy_wh.

Consultas principales:
- Resumen mensual por dispositivo y total.
- Agregacion diaria para graficos.
- Alertas por superacion de umbral.

### 2.7 Consideraciones no funcionales
- Rendimiento: respuesta interactiva en dashboard.
- Confiabilidad: validaciones de ingesta y esquema.
- Mantenibilidad: separacion por capas (firmware/API/frontend).
- Escalabilidad: posibilidad de migrar a motor SQL servidor.

---

## Capitulo 3 - Modelo de negocio

### 3.1 Propuesta de valor
Solucion de monitoreo energetico accesible para hogares, comercios y pymes, con:

- visibilidad por dispositivo;
- alertas tempranas de sobreconsumo;
- reportes y comparativas para decisiones de ahorro.

### 3.2 Segmentos de clientes
- Pymes (comercios, oficinas, talleres).
- Hogares con alto consumo y necesidad de control.
- Instituciones educativas tecnicas (uso didactico).

### 3.3 Fuentes de ingresos
Modelo mixto:
- venta de kit inicial (ESP32 + sensor + configuracion);
- suscripcion mensual por plataforma (basico, avanzado, premium).

### 3.4 Estructura de costos
- Hardware y reposicion.
- Hosting/despliegue web.
- Soporte tecnico.
- Evolucion funcional y mantenimiento.

### 3.5 Escalabilidad
El modelo permite escalar por software, agregando funciones avanzadas (analitica predictiva, integraciones y reportes ejecutivos) sin redisenar el nucleo.

---

## Capitulo 5 - Diseno e implementacion del sistema

### 5.1 Arquitectura implementada
El sistema final integra:
- firmware MicroPython en ESP32;
- backend Flask con SQLite;
- frontend Next.js;
- autenticacion web con Supabase.

### 5.2 Backend API real del proyecto
Prefijo: `/api/v1`

Endpoints relevantes:
- `POST /devices`
- `GET /devices`
- `PATCH /devices/{id}`
- `DELETE /devices/{id}`
- `POST /measurements` (ingesta ESP32)
- `GET /metrics/summary_month?month=YYYY-MM`
- `GET /metrics/daily?device_id=...&from=...&to=...`
- `GET /export/measurements.csv?month=YYYY-MM`
- `GET /export/daily.csv?month=YYYY-MM`
- `GET /export/alerts.csv?month=YYYY-MM`

Persistencia: SQLite (`backend/app/schema.sql`).

### 5.3 Firmware y adquisicion de datos
El ESP32 lee INA219 por I2C (SCL/SDA), calcula:
- `voltage` (V)
- `current` (A)
- `power` (W)
- `energy_wh` (incremental)

Luego envia mediciones periodicas por HTTP con API key de dispositivo.

### 5.4 Frontend y experiencia de usuario
Vistas implementadas:
- Home (`/`)
- Planes (`/planes`, `/planes/basico`, `/planes/avanzado`, `/planes/premium`)
- Checkout (`/checkout`)
- Carrito (`/carrito`)
- Dashboard (`/dashboard`)

Autenticacion:
- Login Google desde header.
- Callback OAuth en `/auth/callback`.
- Manejo de variables de entorno para Supabase.

### 5.5 Flujo extremo a extremo
1. ESP32 mide variables electricas.
2. ESP32 envia JSON a `POST /api/v1/measurements` con `X-API-Key`.
3. Flask valida e inserta en SQLite.
4. Frontend consulta metricas y exportes via `/api/*`.
5. Usuario visualiza dashboard, alertas y reportes.

### 5.6 Resultado de implementacion
La version actual del proyecto permite:
- ingesta de mediciones reales;
- analisis mensual por dispositivo;
- alertas por umbral;
- exportes CSV;
- acceso autenticado al frontend con Google.

---

## Anexo A - Firmware MicroPython (extracto consistente con repo)

```python
import time
import network
from machine import I2C, Pin
import ujson
import urequests

from config_local import SSID, PASS, PC_IP, API_KEY, I2C_ADDR, R_SHUNT_OHMS, INTERVAL_S

URL = "http://%s:5000/api/v1/measurements" % PC_IP

def post_measurement(v, i, p, e_wh):
    payload = {
        "voltage": round(v, 3),
        "current": round(i, 6),
        "power": round(p, 3),
        "energy_wh": round(e_wh, 6),
    }
    headers = {"Content-Type": "application/json", "X-API-Key": API_KEY}
    r = urequests.post(URL, data=ujson.dumps(payload), headers=headers)
    r.close()
```

Archivo fuente completo: `hardware/esp32/micropython/main.py`.

## Anexo B - Variables de entorno frontend (Supabase)

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Notas:
- Tambien se admite `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` como alternativa de key publica.
- El callback OAuth debe estar registrado como `http://localhost:3000/auth/callback`.

---

## Conclusion general
El proyecto implementa un sistema IoT funcional de monitoreo energetico, con arquitectura modular, telemetria real, backend robusto, interfaz web completa y autenticacion moderna. El estado actual es consistente con los objetivos de tesis y deja una base valida para evolucion futura en precision, escalabilidad y despliegue productivo.
