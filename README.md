# 📊 Sistema de Monitoreo de Consumo Energético con IoT

**Tesis de grado completa de Valentina Peirano y Tomas Sisterna para la Licenciatura en Gestión de Sistemas y Negocios**

Este proyecto desarrolla una plataforma integral para el monitoreo en tiempo real del consumo energético en hogares y pequeñas empresas. El sistema permite identificar patrones de consumo, detectar consumos anómalos y generar alertas para promover la eficiencia energética.

## 🚀 Características Principales

- **Monitoreo en Tiempo Real**: Visualización del consumo energético actual de múltiples dispositivos.
- **Análisis Histórico**: Gráficos interactivos para analizar el consumo por hora, día y mes.
- **Alertas Inteligentes**: Notificaciones automáticas cuando el consumo excede umbrales predefinidos.
- **Gestión de Dispositivos**: Administración de dispositivos IoT y configuración de parámetros de monitoreo.
- **Interfaz Web Responsiva**: Diseño moderno y adaptable a dispositivos móviles y de escritorio.

## 🛠️ Tecnologías Utilizadas

### Backend
- **Python 3.10+**
- **Flask**: Microframework web ligero y flexible.
- **SQLite**: Base de datos SQL integrada (sin configuración de servidor).
- **Werkzeug/Jinja2**: Utilidades core de Flask.

### Frontend
- **Next.js 16**: Framework de React para producción (App Router).
- **React 19**: Librería para interfaces de usuario.
- **Tailwind CSS v4**: Framework de utilidades CSS.
- **TypeScript**: Tipado estático para JavaScript.

## 📂 Estructura del Proyecto

```
.                                        # Raíz del proyecto
├── backend/                             # API Server (Flask)
│   ├── app/
│   │   ├── __init__.py                  # Factory de la App Flask
│   │   ├── __main__.py                  # Entry point de desarrollo
│   │   ├── config.py                    # Configuración
│   │   ├── db.py                        # Funciones de acceso a SQLite
│   │   ├── routes.py                    # Endpoints de la API y Vistas
│   │   ├── schema.sql                   # Esquema de la base de datos
│   │   └── seed.py                      # Script para poblar datos de prueba
│   ├── tools/                           # Scripts de utilidad
│   ├── .venv/                           # Entorno virtual
│   └── requirements.txt                 # Dependencias
├── frontend/                            # Cliente Web (Next.js)
│   ├── app/                             # Next.js App Router (Páginas y Layouts)
│   │   ├── dashboard/                   # Vista principal de métricas
│   │   ├── globals.css                  # Estilos globales (Tailwind)
│   │   ├── layout.tsx                   # Layout raíz
│   │   └── page.tsx                     # Landing page
│   ├── public/                          # Archivos estáticos
│   ├── next.config.ts                   # Configuración de Next.js (Proxy API)
│   └── package.json                     # Dependencias
├── data/                                # Base de datos SQLite (generada al iniciar)
└── README.md                            # Documentación
```

## 🚀 Instalación y Ejecución

### Requisitos Previos
- **Python 3.10+**
- **Node.js 18+**

### 1. Backend (Flask)

```bash
# Navegar al directorio backend
cd backend

# Crear entorno virtual
python -m venv .venv

# Activar entorno virtual
# Windows:
.\.venv\Scripts\Activate
# macOS/Linux:
# source .venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Ejecutar servidor de desarrollo (puerto 5000)
# Esto inicializará la base de datos automáticamente si no existe.
python -m app
```

El servidor API estará disponible en `http://localhost:5000`.

### 2. Frontend (Next.js)

```bash
# Navegar al directorio frontend
cd frontend

# Instalar dependencias
npm install

# Ejecutar servidor de desarrollo (puerto 3000)
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.
El frontend está configurado para redirigir las llamadas `/api/*` automáticamente al backend (`http://127.0.0.1:5000`) para evitar problemas de CORS en desarrollo.

## 📊 Endpoints Disponibles

La API se encuentra prefijada bajo `/api/v1`.

### Dispositivos
- `GET /api/v1/devices`: Listar dispositivos.
- `POST /api/v1/devices`: Crear dispositivo.
- `PATCH /api/v1/devices/{id}`: Actualizar dispositivo (nombre, umbral).
- `DELETE /api/v1/devices/{id}`: Eliminar dispositivo y sus mediciones.

### Mediciones e Ingesta
- `POST /api/v1/measurements`: Registrar medición (Usado por Firmware ESP32).
  - Headers: `X-API-Key: <device_api_key>`
  - Body: `{ "energy_wh": 12.5, "power": 300, ... }`

### Métricas (Dashboard)
- `GET /api/v1/metrics/summary_month`: Resumen mensual, alertas y top consumidor.
- `GET /api/v1/metrics/daily`: Consumo diario agrupado.

### Exportación
- `GET /api/v1/export/measurements.csv`: Descarga CSV de mediciones.
- `GET /api/v1/export/daily.csv`: Descarga CSV diario.
- `GET /api/v1/export/alerts.csv`: Descarga CSV de alertas.

## 🤝 Contribuciones

Este proyecto fue desarrollado como parte del trabajo de tesis de:

- **Valentina Peirano**
- **Tomas Sisterna**

## 📄 Licencia

Este proyecto es parte de un trabajo académico.
---
**Desarrollado para la Licenciatura en Gestión de Sistemas y Negocios**
