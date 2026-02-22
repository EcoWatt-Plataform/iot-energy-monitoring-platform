# EcoWatt - Plataforma IoT de Monitoreo Energetico

EcoWatt es una plataforma para monitorear consumo electrico en hogares y pymes.
Este repositorio contiene backend, frontend, scripts de deploy y utilidades para simulacion IoT.

## Estado actual

- Backend Flask con API REST versionada en `/api/v1`.
- Frontend Next.js 16 (App Router) con landing, planes, carrito, checkout, dashboard y panel admin.
- Integracion con Supabase Auth para usuarios y administradores.
- Solicitudes de compra persistidas en SQLite con estado e idempotencia.
- Deploy automatizado para `ecowatt.ar` con systemd + nginx + health checks.

## Planes SaaS (mensual, ARS)

| Plan | Precio | Max medidores | Historial | Dashboard | Alertas | Exportaciones |
| --- | ---: | ---: | --- | --- | --- | --- |
| Basico | 7.900/mes | 1 | 3 meses | Diario y mensual | Simples | No |
| Avanzado | 12.900/mes | 3 | 12 meses | Diario, semanal, mensual y comparativas | Simples | No |
| Premium | 19.900/mes | 6 | Extendido | Completo | Avanzadas | CSV/PDF/Excel |

Nota: no existe funcionalidad multiusuario por plan.

## Hardware (venta unica, ARS)

| Producto | Precio | Detalle |
| --- | ---: | --- |
| EcoWatt Plug | 49.900 | Enchufable entre toma y dispositivo |
| EcoWatt Panel 1 fase | 149.900 | Medidor de tablero 1F con 1 pinza CT |
| EcoWatt Panel 3 fases | 219.900 | Medidor de tablero 3F con 3 pinzas CT |
| Fase extra | 34.900 | Pinza CT adicional + configuracion |

## Stack tecnico

- Backend: Python 3.10+, Flask 3, SQLite, python-dotenv.
- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS v4.
- Auth: Supabase Auth (usuario final y admin).
- Infra: nginx + systemd (deploy en Vultr).

## Estructura del repo

```text
.
|- backend/
|  |- app/                 # API Flask, rutas, DB y esquema
|  |- tools/               # utilidades (seed, simulacion)
|  |- requirements.txt
|- frontend/
|  |- app/                 # rutas App Router
|  |- lib/                 # helpers de compra y supabase
|  |- public/              # assets (logo, OG image)
|  |- package.json
|- deploy/ecowatt.ar/      # script deploy + plantillas
|- docs/                   # documentacion adicional
`- README.md
```

## Variables de entorno

### Backend (`backend/.env`)

Minimo requerido:

```env
APP_SECRET=dev-secret-change-me
DB_PATH=./data/sisterna.sqlite
SUPABASE_URL=https://TU_PROYECTO.supabase.co
SUPABASE_ANON_KEY=TU_SUPABASE_ANON_KEY
```

Para endpoints admin:

```env
SUPABASE_SERVICE_ROLE_KEY=TU_SUPABASE_SERVICE_ROLE_KEY
ADMIN_EMAILS=admin@ecowatt.com,otro-admin@ecowatt.com
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Ejecucion local

### 1) Backend

```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate
# Linux/macOS:
# source .venv/bin/activate
pip install -r requirements.txt
python -m app
```

Backend local: `http://127.0.0.1:5000`

### 2) Frontend

```bash
cd frontend
npm ci
npm run dev
```

Frontend local: `http://localhost:3000`

En desarrollo, `frontend/next.config.ts` reescribe `/api/*` a `http://127.0.0.1:5000/api/*`.

## API (resumen)

Base: `/api/v1`

### Publicos

- `GET /api/v1/health`
- `POST /api/v1/checkout/request`

`POST /api/v1/checkout/request`:

- valida plan, cantidades, datos de comprador y limites por plan.
- aplica rate limit por IP (5 requests cada 60 segundos).
- soporta `idempotency_key` opcional para evitar duplicados.

Payload ejemplo:

```json
{
  "plan": "basico",
  "meters": {
    "plug": 1,
    "panel_1f": 0,
    "panel_3f": 0,
    "extra_phase": 0
  },
  "buyer": {
    "full_name": "Nombre Apellido",
    "phone": "+54 9 11 1234 5678",
    "email": "cliente@email.com",
    "document_type": "dni",
    "document_number": "30111222",
    "address": "Calle 123",
    "property_type": "casa"
  },
  "idempotency_key": "checkout_abc123"
}
```

### Requieren Bearer token (Supabase)

- `POST /api/v1/devices`
- `GET /api/v1/devices`
- `PATCH /api/v1/devices/{id}`
- `DELETE /api/v1/devices/{id}`
- `POST /api/v1/measurements` (tambien admite `X-API-Key` del dispositivo)
- `GET /api/v1/metrics/summary_month`
- `GET /api/v1/metrics/daily`

### Exportaciones (solo Premium)

- `GET /api/v1/export/measurements.csv`
- `GET /api/v1/export/daily.csv`
- `GET /api/v1/export/alerts.csv`

### Admin (requiere rol admin)

- `GET /api/v1/admin/me`
- `GET /api/v1/admin/users`
- `POST /api/v1/admin/users`
- `PATCH /api/v1/admin/users/{user_id}`
- `DELETE /api/v1/admin/users/{user_id}`
- `GET /api/v1/admin/checkout-requests`
- `PATCH /api/v1/admin/checkout-requests/{request_id}`

## Scripts utiles

```bash
# desde backend/
python tools/seed_demo.py
python tools/simulate_measurements.py --base-url http://127.0.0.1:5000 --owner-user-id <UUID>
```

## Deploy en servidor (`ecowatt.ar`)

Script principal:

```bash
cd /opt/ecowatt/app
./deploy/ecowatt.ar/deploy.sh main
# o
./deploy/ecowatt.ar/deploy.sh develop
```

El script hace:

- `git fetch/checkout/pull` de la rama objetivo.
- instalacion backend (`pip`) y frontend (`npm ci` + `npm run build`).
- restart de `ecowatt-backend`, `ecowatt-frontend` y reload de `nginx`.
- health checks:
  - `GET http://127.0.0.1:5000/health`
  - `GET https://ecowatt.ar/api/v1/health`
  - `POST /api/v1/checkout/request` (probe)
  - `GET https://ecowatt.ar/admin/login`

Documentacion de deploy: `docs/deploy-ecowatt-ar.md`
