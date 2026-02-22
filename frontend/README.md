# EcoWatt Frontend

Frontend web de EcoWatt construido con Next.js 16 (App Router).

## Alcance funcional

- Landing publica (`/`, `/producto`, `/soporte`, `/terminos`).
- Paginas de planes (`/planes`, `/planes/basico`, `/planes/avanzado`, `/planes/premium`).
- Carrito en 3 pasos:
  1. Seleccion de plan SaaS.
  2. Seleccion de medidores (Plug, Panel 1F, Panel 3F, Fase extra).
  3. Formulario de comprador y envio de solicitud.
- Checkout conectado a `POST /api/v1/checkout/request`.
- Dashboard de consumo (`/dashboard`) con restricciones por plan.
- Admin login (`/admin/login`) y panel admin (`/admin`) para gestionar usuarios y solicitudes de checkout.

## Precios y reglas que usa el frontend

Definidos en `frontend/lib/purchase.ts`.

### Planes (mensual, ARS)

- Basico: `7900`, hasta 1 medidor, sin exportaciones.
- Avanzado: `12900`, hasta 3 medidores, sin exportaciones.
- Premium: `19900`, hasta 6 medidores, exportaciones premium.

Nota: no existe funcionalidad multiusuario por plan.

### Hardware (venta unica, ARS)

- EcoWatt Plug: `49900`
- EcoWatt Panel 1 fase: `149900`
- EcoWatt Panel 3 fases: `219900`
- Fase extra: `34900`

## Requisitos

- Node.js 18+
- Backend Flask ejecutandose en `http://127.0.0.1:5000` (en desarrollo)
- Proyecto Supabase configurado para Auth

## Variables de entorno

Crear `frontend/.env.local` desde `frontend/.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Notas:

- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` son obligatorias.
- Para login con Google, configurar URLs de callback en Supabase (`/auth/callback`).

## Comandos

```bash
cd frontend
npm ci
npm run dev
npm run build
npm run start
npm run lint
```

Desarrollo: `http://localhost:3000`

## Integracion con backend

`frontend/next.config.ts` reescribe `/api/:path*` a `http://127.0.0.1:5000/api/:path*`.
Esto evita CORS durante desarrollo local.

## Flujo de checkout (interno)

1. El usuario arma carrito (`plan` + `meters`) y se guarda en localStorage.
2. En `/checkout` completa datos (`fullName`, `phone`, `email`, `documentType`, `documentNumber`, `address`, `propertyType`).
3. El frontend calcula un fingerprint del payload y usa `idempotency_key` para evitar duplicados.
4. Se envia `POST /api/v1/checkout/request`.
5. Si responde OK, se limpia carrito/borrador y se muestra resumen.

Claves de localStorage usadas:

- `ecowatt_purchase_cart_v3`
- `ecowatt_checkout_form_v3`
- `ecowatt_checkout_idempotency_v1`

## Panel admin (frontend)

Para que el panel admin funcione:

- El backend debe tener `SUPABASE_SERVICE_ROLE_KEY`.
- El backend debe definir `ADMIN_EMAILS` con los correos permitidos.

Rutas:

- `/admin/login`
- `/admin`

## Branding y metadatos

Definidos en `frontend/app/layout.tsx`:

- Icono navegador: `/logo.PNG`
- Open Graph / WhatsApp preview: `/og-ecowatt.jpg`

## Estructura relevante

```text
frontend/
|- app/
|  |- admin/
|  |- carrito/
|  |- checkout/
|  |- dashboard/
|  |- planes/
|  |- layout.tsx
|- lib/
|  |- purchase.ts
|  `- supabase/
|- public/
|  |- logo.PNG
|  `- og-ecowatt.jpg
`- next.config.ts
```
