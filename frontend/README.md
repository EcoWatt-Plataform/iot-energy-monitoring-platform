# Frontend - IoT Energy Monitoring Platform

Aplicacion Next.js del proyecto, con autenticacion via Supabase y visualizacion del dashboard de consumo.

## Requisitos

- Node.js 18+
- npm
- Backend Flask corriendo en `http://127.0.0.1:5000`

## Instalacion

```bash
cd frontend
npm install
```

## Variables de entorno

Crear `frontend/.env.local` con:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY
# Alternativa valida si ya la usas:
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=TU_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Tambien puedes partir desde `frontend/.env.example`.

## Configuracion de Supabase (Google OAuth)

1. Supabase > Settings > API: copiar URL y key publica.
2. Supabase > Authentication > URL Configuration:
   - Site URL: `http://localhost:3000`
   - Redirect URL: `http://localhost:3000/auth/callback`
3. Supabase > Authentication > Providers > Google:
   - habilitar Google
   - cargar Client ID/Secret de Google Cloud

## Ejecutar en desarrollo

```bash
npm run dev
```

Abrir `http://localhost:3000`.

## Build de produccion

```bash
npm run build
npm run start
```

## Flujo esperado

1. Click en `Ingresar con Google`.
2. Supabase redirige a Google.
3. Callback en `/auth/callback`.
4. Redireccion a `/dashboard`.

## Problemas comunes

- Error de variables Supabase: revisar `.env.local` y reiniciar Next.
- Dashboard vacio o errores API: confirmar backend Flask en `127.0.0.1:5000`.
- Error de redirect OAuth: revisar URLs en Supabase exactamente como arriba.
