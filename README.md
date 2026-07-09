# Sistema de Monitoreo de Consumo Energetico con IoT

Proyecto de tesis para la Licenciatura en Gestion de Sistemas y Negocios.

## Descripcion

Plataforma para monitoreo de consumo energetico en tiempo real, analisis historico y alertas por sobreconsumo.

## Stack

- Backend: Python, Flask, SQLite
- Frontend: Next.js 16 (App Router), React 19, TypeScript
- Auth: Supabase (Google OAuth)

## Estructura

- `backend/`: API Flask y logica de datos
- `frontend/`: aplicacion web Next.js
- `hardware/`: codigo de firmware/dispositivos
- `docs/`: documentacion adicional

## Requisitos

- Python 3.10+
- Node.js 18+
- npm

## Levantar backend (Flask)

```bash
cd backend
python -m venv .venv
# Windows
.\.venv\Scripts\Activate
pip install -r requirements.txt
python -m app
```

Backend disponible en `http://127.0.0.1:5000`.

## Levantar frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Frontend disponible en `http://localhost:3000`.

`frontend/next.config.ts` ya reescribe `/api/*` hacia `http://127.0.0.1:5000/api/*` en desarrollo.

## Configurar login con Google (Supabase)

1. Crear `frontend/.env.local` (puedes copiar desde `frontend/.env.example`).
2. Definir:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (o `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`)
   - `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
3. En Supabase > Auth > URL Configuration:
   - Site URL: `http://localhost:3000`
   - Redirect URL: `http://localhost:3000/auth/callback`
4. En Supabase > Auth > Providers > Google: habilitar y configurar credenciales OAuth.

## Endpoints principales

- `GET /api/v1/devices`
- `POST /api/v1/devices`
- `PATCH /api/v1/devices/{id}`
- `DELETE /api/v1/devices/{id}`
- `GET /api/v1/metrics/summary_month?month=YYYY-MM`
- `GET /api/v1/export/daily.csv?month=YYYY-MM&device_id=<id>`

## Troubleshooting rapido

- Si el login falla por variables de Supabase: revisar `frontend/.env.local` y reiniciar `npm run dev`.
- Si el dashboard no muestra datos: verificar backend activo en `127.0.0.1:5000`.
