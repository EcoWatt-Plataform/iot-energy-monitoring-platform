# Proyecto IoT de Monitoreo Energético

## Capítulo 1 - Introducción

### 1.1 Contexto y motivación
El Internet de las Cosas (IoT) permite que objetos físicos se conecten a internet para capturar y transmitir datos en tiempo real. En el ámbito energético, esta capacidad abre la puerta a medir, analizar y optimizar el consumo eléctrico de hogares, pequeñas y medianas empresas (pymes), favoreciendo la eficiencia energética y la reducción de costos.

La propuesta de este trabajo se enmarca en esa tendencia: un sistema que mide el consumo por dispositivo, genera estadísticas mensuales y emite alertas si se superan umbrales definidos por el usuario.

### 1.2 Planteo del problema y oportunidad
El consumo eléctrico residencial y pyme suele gestionarse de forma global (la factura total), sin visibilidad por dispositivo individual. Esto dificulta:

- detectar patrones de alto consumo;
- comparar consumos entre meses y entre dispositivos;
- tomar decisiones informadas para reducir costos.

La oportunidad consiste en proveer telemetría de bajo costo con un ESP32 y una capa de software que centralice datos y los convierta en información accionable (tableros, comparativas, alertas). El diseño propuesto no automatiza el encendido/apagado, sino que informa y asiste al usuario para un uso responsable.

### 1.3 Objetivo general
Diseñar e implementar un sistema IoT (hardware + software) que mida, registre, analice y visualice el consumo energético por dispositivo en hogares o pymes, generando informes mensuales, comparativas históricas y alertas al superar límites de consumo definidos por el usuario.

### 1.4 Objetivos específicos
- Seleccionar y configurar el hardware (ESP32, sensores/entradas, almacenamiento local).
- Desarrollar el firmware en MicroPython para lectura de uso y cálculo de consumo.
- Implementar persistencia (archivo CSV local / microSD y/o envío por Wi-Fi a un servidor).
- Construir la capa de software para visualización (estadísticas mensuales, comparativas y reporte del dispositivo de mayor consumo).
- Implementar mecanismo de alertas por superación de umbrales mensuales.
- Diseñar y ejecutar un plan de pruebas (hardware, comunicaciones, tiempos de respuesta y exactitud de registros).
- Documentar la arquitectura, decisiones de diseño y resultados.

### 1.5 Alcance del trabajo
Incluye:

- Prototipo funcional con ESP32 y entradas simuladas/LEDs para validar la captura y el cómputo de consumo.
- Registro de eventos y cálculo de consumo por dispositivo, con persistencia en CSV (microSD o servidor).
- Transmisión Wi-Fi de datos hacia un servidor Python/Flask que persiste el consumo en CSV.
- Visualizaciones y reportes mensuales con comparativas y detección del dispositivo de mayor consumo.
- Alertas por superación de umbrales.

Exclusiones (no forman parte de esta tesis):

- Automatización de cargas (encendido/apagado inteligente).
- Integración con proveedores de energía/medidores inteligentes comerciales.
- App móvil nativa (puede proponerse como trabajo futuro).
- Certificaciones eléctricas para producción.

### 1.6 Supuestos y restricciones
Supuestos:

- Disponibilidad de conectividad Wi-Fi local estable para transmitir datos al servidor.
- Acceso a un equipo con Python/Flask para recibir y almacenar registros.
- El consumo por dispositivo puede inferirse a partir de tiempo de uso y potencia nominal (modelo inicial), o de mediciones directas en versiones futuras.

Restricciones:

- Tiempo de desarrollo planificado en dos cuatrimestres (investigación + prototipo / desarrollo + validación).
- Hardware de bajo costo (ESP32 y periféricos) y stack ligero (MicroPython + CSV/Flask).
- Limitaciones de precisión cuando el consumo se estima por tiempo de uso (si no se incorpora medición de corriente/tensión).

### 1.7 Beneficiarios y partes interesadas
- Usuarios finales: hogares y pymes que buscan visibilidad y ahorro energético.
- Equipo de desarrollo (autores): responsables de diseño, implementación y pruebas.
- Tutor/cátedra: acompañamiento metodológico y validación académica.
- Futuros socios/proveedores: suministro de hardware y hosting (posibles en etapas de transferencia tecnológica).

El detalle de stakeholders y su matriz de interés/impacto se ampliará en el Capítulo de Requerimientos.

### 1.8 Metodología general de trabajo
Se adopta un enfoque iterativo e incremental:

- Iteración 1: investigación, análisis de requerimientos y prototipo con lectura de uso y cálculo de consumo; persistencia local (CSV en microSD).
- Iteración 2: conectividad Wi-Fi y API Flask para envío y almacenamiento centralizado; primeros reportes.
- Iteración 3: visualizaciones mensuales, comparativas, detección de mayor consumo y alertas.
- Iteración 4: pruebas y validación (rendimiento, exactitud, usabilidad) y ajustes finales para defensa de tesis.

Este enfoque permite probar temprano las decisiones técnicas (ESP32 + MicroPython + Flask/CSV) y reducir riesgo mediante validaciones sucesivas.

### 1.9 Criterios de éxito e indicadores
- **CS1 – Registro confiable:** 100% de los eventos de uso generan entradas persistidas (CSV local o servidor).
  - Indicador: tasa de registros válidos / eventos detectados ≥ 0,98.
- **CS2 – Visualización útil:** el usuario puede ver estadísticas mensuales, comparativas y top consumidor.
  - Indicador: presencia de vistas y correcta agregación mensual verificada con datos de prueba.
- **CS3 – Alertas:** se emite alerta cuando el consumo mensual supera el umbral definido.
  - Indicador: generación de alerta en escenarios controlados.
- **CS4 – Rendimiento:** latencia de envío de evento → persistencia ≤ 2 s en red local.
- **CS5 – Robustez:** tolerancia a pérdida temporal de Wi-Fi (reintentos/cola básica o almacenamiento local).

### 1.10 Entregables del Capítulo 1
- Documento de Introducción con: contexto, problema, objetivos, alcance, supuestos, metodología e indicadores.
- Glosario de términos y acrónimos (IoT, ESP32, CSV, API, Flask, Wi-Fi).
- Plan macro de trabajo (coherente con el cronograma de dos cuatrimestres).

### 1.11 Plan de trabajo y cronograma macro
Con base en el plan ya definido, el proyecto se organiza en dos cuatrimestres:

- 1º cuatrimestre: investigación IoT, análisis de requerimientos, selección de hardware, diseño de arquitectura y prototipo con sensores/ESP32.
- 2º cuatrimestre: desarrollo del software de monitoreo/visualización, pruebas con dispositivos reales, generación de informes mensuales, validación de alertas y documentación final.

Hitos sugeridos:

- H1) Requerimientos y arquitectura
- H2) Prototipo local con CSV
- H3) API Flask y envío Wi-Fi
- H4) Dashboard y alertas
- H5) Validación y cierre

### 1.12 Organización del documento
- Cap. 1 – Introducción: este capítulo.
- Cap. 2 – Marco teórico: IoT, medición de consumo, trabajos relacionados.
- Cap. 3 – Modelo de negocio: Canvas, propuesta de valor y análisis de costos.
- Cap. 4 – Requerimientos: funcionales y no funcionales, stakeholders, casos de uso.
- Cap. 5 – Diseño e implementación: arquitectura, firmware, API Flask, persistencia y UI.
- Cap. 6 – Pruebas y resultados: metodología de test y análisis de datos.
- Cap. 7 – Conclusiones y trabajo futuro: síntesis y líneas de mejora.

### 1.13 Definiciones y acrónimos
- **IoT:** Internet of Things.
- **ESP32:** microcontrolador con Wi-Fi/BLE integrado.
- **CSV:** formato de archivo de valores separados por comas.
- **API:** interfaz de programación de aplicaciones para intercambio de datos (aquí, Flask).
- **Umbral:** límite de consumo mensual que, al superarse, dispara una alerta.

---

## Capítulo 2 · Marco Teórico

### 2.1 Fundamentos de IoT
El Internet de las Cosas (IoT) se refiere al ecosistema de dispositivos físicos interconectados que recopilan y transmiten datos. Sus capas son: percepción (sensores/ESP32), red (Wi-Fi, MQTT), procesamiento (Flask/API) y aplicación (dashboard). Permite la trazabilidad, monitoreo y optimización de consumos energéticos.

### 2.2 Medición de energía eléctrica
El consumo se calcula integrando potencia en el tiempo (E = Σ P·Δt). Se mide mediante sensores de corriente/tensión o, en prototipos, por tiempo de uso y potencia nominal. El proyecto utiliza la segunda opción por simplicidad.

### 2.3 Arquitectura de referencia
El sistema se divide en:

1. **Edge** – ESP32 que mide y envía datos.
2. **Backend** – Servidor Flask que almacena y procesa información.
3. **Dashboard** – interfaz que muestra estadísticas y alertas.

### 2.4 Tecnologías empleadas
- **ESP32:** microcontrolador con Wi-Fi/BLE integrado, dual-core, ADC, temporizadores y buen ecosistema.
- **MicroPython:** sintaxis Python en microcontroladores; acelera el prototipado y permite código claro y mantenible.
- **Servidor/API:** Flask (Python), liviano e ideal para endpoints de ingestión y persistencia.

Persistencia:

- **CSV:** simple, portable; adecuado para prototipos.
- **SQLite:** base local embebida con consultas SQL y transacciones.
- **MySQL/PostgreSQL:** multiusuario, concurrencia y escalabilidad.
- **Time-series DB (InfluxDB/Timescale):** agregaciones temporales y retención optimizada.

Visualización: HTML/JS, frameworks (React/Vue).

### 2.5 Comunicación y protocolos
La comunicación se realiza por Wi-Fi mediante HTTP/REST. Alternativas: MQTT para mayor eficiencia o WebSocket para datos en tiempo real.

Seguridad:

- TLS cuando sea posible.
- Autenticación por token o API Key.
- Segmentación de red (LAN) para el prototipo.
- Registro de eventos de auditoría (quién envió qué y cuándo).

### 2.6 Modelado de datos y series temporales
Cada registro contiene timestamp, dispositivo, consumo y unidad. Se procesan agregaciones mensuales y comparativas históricas.

Ejemplos de métricas: `energy_kwh`, `power_w`, `on_time_ms`, `threshold_status`.

Operaciones típicas:

- Agregación temporal (por hora/día/mes).
- Rolling window (promedios móviles, máximos).
- Comparativas (mes vs. mes anterior; top N dispositivos).
- Detección de anomalías simple (z-score, umbrales dinámicos).

Buenas prácticas:

- Timestamps en UTC internamente y conversión a hora local en la UI.
- Idempotencia: manejar reintentos sin duplicar registros.
- Validaciones de esquema y valores (unidades consistentes).

### 2.7 Requerimientos no funcionales
- Confiabilidad: tolerar cortes breves de Wi-Fi (buffer local y reenvío).
- Rendimiento: latencia evento→persistencia ≤ 1–2 s en red local.
- Escalabilidad: soportar más dispositivos sin rediseñar (fila de mensajes, colas).
- Mantenibilidad: código modular, logs y trazas.
- Seguridad y privacidad: datos en tránsito cifrados; almacenamiento y backups.
- Costo total de propiedad (TCO): hardware accesible y operación simple.

### 2.8 Analítica y reglas de negocio
- **Consumo mensual por dispositivo:** E_mes = Σ E_evento.
- **Ranking de consumo:** ordenar por E_mes y destacar el mayor consumidor.
- **Alertas por umbral:** si E_mes > umbral_usuario ⇒ generar alerta (email/UI/notificación).

KPIs sugeridos:

- Consumo total mensual.
- Reducción intermensual (%).
- Top 3 dispositivos.
- Factor de uso (tiempo encendido/total).

### 2.9 Trabajos relacionados
- Medidores inteligentes residenciales.
- Smart plugs.
- Plataformas DIY de automatización hogareña.

Diferenciación del presente proyecto: foco en bajo costo, despliegue local, transparencia de datos y enfoque didáctico (tesis), con roadmap para evolucionar a medición directa y bases de datos más robustas.

### 2.10 Riesgos técnicos y mitigaciones (enfoque teórico)
- Pérdida de datos por corte de red: buffer local y reintentos exponenciales.
- Inconsistencias por archivos CSV concurrentes: escritura secuencial y file locking o migración a SQLite.
- Deriva en estimación por potencia nominal: recalibración periódica y/o transición a medición directa.
- Desbordes/errores en firmware: watchdog, logs y pruebas de estrés.

### 2.11 Conclusiones del marco teórico
El marco teórico sustenta que una arquitectura IoT modular con ESP32 + API ligera + almacenamiento simple permite medir, almacenar y analizar consumo energético de forma incremental. La combinación de series temporales, reglas de negocio (umbral/alertas) y visualización brinda información accionable.

---

## Capítulo 3 · Modelo de Negocio

### 3.1 Introducción
El modelo de negocio propuesto busca transformar el desarrollo técnico del sistema IoT en un servicio comercial de monitoreo energético accesible y escalable, orientado principalmente a pymes y comercios minoristas.

### 3.2 Propuesta de valor
- Accesibilidad económica.
- Facilidad de uso.
- Transparencia y control.
- Optimización de costos.
- Enfoque educativo y resolutivo.

### 3.3 Segmento de clientes
- Pymes (oficinas, comercios, talleres, gastronómicos, servicios).
- Comercios con alto consumo eléctrico.
- Instituciones educativas técnicas.

### 3.4 Canales de distribución y comunicación
- Sitio web oficial.
- Redes sociales y marketing digital.
- Ferias y convenios con proveedores eléctricos locales.
- Alianzas con instaladores o distribuidores de hardware.

### 3.5 Relación con el cliente
- Autonomía del usuario.
- Soporte postventa.
- Retroalimentación continua.

### 3.6 Fuentes de ingresos
| Modalidad | Descripción | Precio estimado |
|---|---|---|
| Suscripción básica | 1 dispositivo, monitoreo en tiempo real, gráficos diarios, historial básico. | ARS 5.000 / mes |
| Suscripción avanzada | 1 dispositivo, monitoreo en tiempo real, gráficos por día/semana/mes, historial extendido, comparaciones, alertas simples. | ARS 10.000 / mes |
| Suscripción premium | 1 dispositivo, historial extendido, gráficos avanzados, alertas avanzadas y reportes descargables. | ARS 15.000 / mes |

También se prevé ingreso por venta inicial de kits de hardware (ESP32 + sensores + fuente), con costo promedio de ARS 35.000 por unidad.

### 3.7 Recursos clave
- Hardware.
- Software.
- Infraestructura web.
- Capital humano.
- Partners estratégicos.

### 3.8 Actividades clave
- Diseño y ensamblado del kit IoT.
- Desarrollo y mantenimiento de la plataforma SaaS.
- Control de calidad y pruebas funcionales.
- Soporte técnico y gestión de clientes.
- Marketing digital y posicionamiento web.

### 3.9 Socios y alianzas estratégicas
| Socio | Tipo de colaboración | Beneficio mutuo |
|---|---|---|
| Grupo Núcleo (Mar del Plata) | Proveedor de hardware y kits ESP32. | Garantiza stock y asesoramiento técnico. |
| EDEA S.A. | Empresa eléctrica local, apoyo en datos y difusión. | Potencial integración con programas de eficiencia energética. |
| Institutos educativos técnicos | Uso del sistema como herramienta formativa. | Promoción institucional y validación académica. |

### 3.10 Estructura de costos (estimada)
| Concepto | Costo mensual (ARS) | Observaciones |
|---|---:|---|
| Hosting y dominio web | 3.000 | Hosting compartido inicial. |
| Servidores/API Flask | 5.000 | VPS o cloud básico. |
| Soporte y mantenimiento | 10.000 | Mano de obra y atención. |
| Marketing digital | 8.000 | Redes sociales y pauta local. |
| Energía y conectividad | 2.000 | Costo operativo. |

Costo total estimado mensual: ARS 28.000–30.000 (sin incluir hardware).

### 3.11 Sostenibilidad y escalabilidad
El modelo es sostenible por bajo costo operativo y escalabilidad digital. En el mediano plazo puede incorporar app móvil, IA para predicción y dashboard avanzado.

### 3.12 Conclusión
El modelo de negocio combina innovación tecnológica, bajo costo y enfoque educativo, con estructura SaaS para ingresos recurrentes e impacto económico, social y ambiental positivo.

---

## Capítulo 5 - Diseño e implementación del sistema IoT

### 5.1 Introducción
Se describe la arquitectura general, hardware seleccionado, firmware para ESP32, servidor de recepción y lineamientos de interfaz de usuario.

### 5.2 Arquitectura general
Cuatro capas:

1. Sensado y control.
2. Comunicación.
3. Procesamiento y almacenamiento.
4. Aplicación.

### 5.3 Diseño de hardware
- ESP32 como núcleo.
- Simulación de cargas con LEDs y botones.
- Almacenamiento local en microSD.
- Integración de sensor de corriente INA249.

### 5.4 Firmware en ESP32 (MicroPython)
- Versión 1: simulación por tiempo de uso.
- Versión 2: registro en CSV en microSD.
- Versión 3: envío por Wi-Fi a servidor Flask.

### 5.5 Servidor y backend
- Flask con endpoint `/guardar` (POST JSON).
- Persistencia en `consumo.csv`.
- Consideraciones básicas de seguridad para red local.

### 5.6 Interfaz de usuario
- Vistas públicas (landing + planes).
- Registro e inicio de sesión.
- Dashboard de consumo y alertas.
- Configuración de dispositivos y umbrales.

### 5.7 Flujo extremo a extremo
1. ESP32 detecta evento o mide corriente.
2. Firmware calcula consumo.
3. Guarda local (microSD) o envía por Wi-Fi.
4. Servidor almacena en CSV.
5. Frontend consulta y visualiza estadísticas/alertas.

### 5.8 Resumen del capítulo
Se consolidan los elementos técnicos para validar el sistema y preparar el análisis de resultados.

---

## Anexo A · Código en MicroPython (Versiones)

### Versión 1
```python
from machine import Pin
import time

# Configuración de LEDs
led1 = Pin(21, Pin.OUT)
led2 = Pin(22, Pin.OUT)

# Configuración de botones
boton1 = Pin(18, Pin.IN, Pin.PULL_UP)
boton2 = Pin(19, Pin.IN, Pin.PULL_UP)

# Estado y tiempo de uso
estado1 = False
estado2 = False

inicio1 = 0
inicio2 = 0

tiempo_total1 = 0
tiempo_total2 = 0

def calcular_consumo(tiempo_ms, consumo_por_hora):
    horas = tiempo_ms / 3600000  # de ms a horas
    return round(horas * consumo_por_hora, 3)

print("Sistema iniciado. Presiona botones para simular uso...")

while True:
    if not boton1.value():  # botón presionado (LOW)
        time.sleep(0.2)  # anti-rebote
        estado1 = not estado1
        led1.value(estado1)
        if estado1:
            inicio1 = time.ticks_ms()
            print("Dispositivo 1 encendido")
        else:
            tiempo_usado = time.ticks_diff(time.ticks_ms(), inicio1)
            tiempo_total1 += tiempo_usado
            consumo = calcular_consumo(tiempo_usado, 1.2)  # kWh simulados
            print("Dispositivo 1 apagado - consumo:", consumo, "kWh")

    if not boton2.value():
        time.sleep(0.2)
        estado2 = not estado2
        led2.value(estado2)
        if estado2:
            inicio2 = time.ticks_ms()
            print("Dispositivo 2 encendido")
        else:
            tiempo_usado = time.ticks_diff(time.ticks_ms(), inicio2)
            tiempo_total2 += tiempo_usado
            consumo = calcular_consumo(tiempo_usado, 0.5)
            print("Dispositivo 2 apagado - consumo:", consumo, "kWh")

    time.sleep(0.1)
```

### Versión 2
```python
from machine import Pin, SPI
import time
import os
import sdcard

# Configurar SD
spi = SPI(1, baudrate=1000000, polarity=0, phase=0,
          sck=Pin(18), mosi=Pin(23), miso=Pin(19))
cs = Pin(5, Pin.OUT)
sd = sdcard.SDCard(spi, cs)
vfs = os.VfsFat(sd)
os.mount(vfs, "/sd")

# LEDs y botones
led1 = Pin(21, Pin.OUT)
led2 = Pin(22, Pin.OUT)
boton1 = Pin(18, Pin.IN, Pin.PULL_UP)
boton2 = Pin(19, Pin.IN, Pin.PULL_UP)

estado1 = False
estado2 = False
inicio1 = 0
inicio2 = 0

def calcular_consumo(tiempo_ms, consumo_por_hora):
    horas = tiempo_ms / 3600000
    return round(horas * consumo_por_hora, 3)

def guardar_csv(dispositivo, consumo):
    try:
        with open("/sd/consumo.csv", "a") as archivo:
            t = time.localtime()  # YYYY,MM,DD,HH,MM,SS
            fecha = "{:04d}-{:02d}-{:02d} {:02d}:{:02d}:{:02d}".format(*t[:6])
            linea = "{},{},{} kWh\n".format(fecha, dispositivo, consumo)
            archivo.write(linea)
            print("Guardado:", linea.strip())
    except Exception as e:
        print("Error al guardar:", e)

print("Sistema iniciado...")

while True:
    if not boton1.value():
        time.sleep(0.2)
        estado1 = not estado1
        led1.value(estado1)
        if estado1:
            inicio1 = time.ticks_ms()
            print("Dispositivo 1 encendido")
        else:
            tiempo_usado = time.ticks_diff(time.ticks_ms(), inicio1)
            consumo = calcular_consumo(tiempo_usado, 1.2)
            guardar_csv("Dispositivo 1", consumo)

    if not boton2.value():
        time.sleep(0.2)
        estado2 = not estado2
        led2.value(estado2)
        if estado2:
            inicio2 = time.ticks_ms()
            print("Dispositivo 2 encendido")
        else:
            tiempo_usado = time.ticks_diff(time.ticks_ms(), inicio2)
            consumo = calcular_consumo(tiempo_usado, 0.5)
            guardar_csv("Dispositivo 2", consumo)

    time.sleep(0.1)
```

### Versión 3
```python
import network
import urequests
import time
from machine import Pin

SSID = 'Nombre_de_Red'
PASSWORD = 'Contraseña'

def conectar_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        print("Conectando a Wi-Fi...")
        wlan.connect(SSID, PASSWORD)
        while not wlan.isconnected():
            time.sleep(1)
    print("Conectado a Wi-Fi:", wlan.ifconfig())

conectar_wifi()

# LEDs y botones
led1 = Pin(21, Pin.OUT)
led2 = Pin(22, Pin.OUT)
boton1 = Pin(18, Pin.IN, Pin.PULL_UP)
boton2 = Pin(19, Pin.IN, Pin.PULL_UP)

estado1 = False
estado2 = False
inicio1 = 0
inicio2 = 0

def calcular_consumo(tiempo_ms, consumo_por_hora):
    horas = tiempo_ms / 3600000
    return round(horas * consumo_por_hora, 3)

def enviar_datos(dispositivo, consumo):
    try:
        url = "http://<IP_DE_TU_COMPU>:5000/guardar"
        datos = {
            "dispositivo": dispositivo,
            "consumo": consumo
        }
        respuesta = urequests.post(url, json=datos)
        print("Enviado:", respuesta.text)
        respuesta.close()
    except Exception as e:
        print("Error al enviar datos:", e)

while True:
    if not boton1.value():
        time.sleep(0.2)
        estado1 = not estado1
        led1.value(estado1)
        if estado1:
            inicio1 = time.ticks_ms()
            print("Dispositivo 1 encendido")
        else:
            tiempo_usado = time.ticks_diff(time.ticks_ms(), inicio1)
            consumo = calcular_consumo(tiempo_usado, 1.2)
            enviar_datos("Dispositivo 1", consumo)

    if not boton2.value():
        time.sleep(0.2)
        estado2 = not estado2
        led2.value(estado2)
        if estado2:
            inicio2 = time.ticks_ms()
            print("Dispositivo 2 encendido")
        else:
            tiempo_usado = time.ticks_diff(time.ticks_ms(), inicio2)
            consumo = calcular_consumo(tiempo_usado, 0.5)
            enviar_datos("Dispositivo 2", consumo)

    time.sleep(0.1)
```

---

## Anexo B · Script en Python (servidor)

### Instalación de dependencias
```bash
pip install flask
```

### `servidor.py`
```python
from flask import Flask, request
import csv
from datetime import datetime

app = Flask(__name__)

@app.route('/guardar', methods=['POST'])
def guardar():
    datos = request.get_json()
    dispositivo = datos.get("dispositivo")
    consumo = datos.get("consumo")
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with open("consumo.csv", "a", newline='') as archivo:
        writer = csv.writer(archivo)
        writer.writerow([timestamp, dispositivo, f"{consumo} kWh"])

    print(f"Guardado: {timestamp}, {dispositivo}, {consumo} kWh")
    return "OK", 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

Esto crea un servidor en `http://TU_IP_LOCAL:5000/guardar` que guarda lo que reciba.

---

## Nota de exportación
Si querés, en un siguiente paso puedo convertir este `.md` a:

- **DOCX** (Word)
- **PDF**

usando una herramienta de conversión (por ejemplo, Pandoc) y dejarte ambos archivos listos en `docs/`.
