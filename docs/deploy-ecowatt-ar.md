# Deploy de la plataforma en `ecowatt.ar`

Esta guía deja **backend (Flask)** + **frontend (Next.js)** online con:
- Ubuntu 22.04/24.04
- `systemd` para procesos
- Nginx como reverse proxy
- HTTPS con Let's Encrypt

> Dominio objetivo: `ecowatt.ar` y `www.ecowatt.ar`.

## 1) Requisitos en el servidor

```bash
sudo apt update
sudo apt install -y git nginx python3 python3-venv python3-pip nodejs npm certbot python3-certbot-nginx
```

Verificá versiones:

```bash
python3 --version
node --version
npm --version
nginx -v
```

## 2) Clonar repo y preparar paths

```bash
sudo mkdir -p /opt/ecowatt
sudo chown -R $USER:$USER /opt/ecowatt
cd /opt/ecowatt
git clone <URL-DEL-REPO> app
cd /opt/ecowatt/app
```

## 3) Variables de entorno

### Backend

```bash
cp deploy/ecowatt.ar/backend.env.example /etc/ecowatt-backend.env
sudo nano /etc/ecowatt-backend.env
```

Completá al menos:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `APP_SECRET` (valor largo y aleatorio)

### Frontend

```bash
cp deploy/ecowatt.ar/frontend.env.example /etc/ecowatt-frontend.env
sudo nano /etc/ecowatt-frontend.env
```

Completá:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL=https://ecowatt.ar`
- `NEXT_PUBLIC_API_BASE_URL=https://ecowatt.ar`

## 4) Backend Flask (servicio systemd)

```bash
cd /opt/ecowatt/app/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
deactivate
```

Instalar service:

```bash
sudo cp /opt/ecowatt/app/deploy/ecowatt.ar/ecowatt-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ecowatt-backend
sudo systemctl status ecowatt-backend
```

## 5) Frontend Next.js (servicio systemd)

```bash
cd /opt/ecowatt/app/frontend
npm ci
npm run build
```

Instalar service:

```bash
sudo cp /opt/ecowatt/app/deploy/ecowatt.ar/ecowatt-frontend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ecowatt-frontend
sudo systemctl status ecowatt-frontend
```

## 6) Nginx y dominio

Copiar configuración:

```bash
sudo cp /opt/ecowatt/app/deploy/ecowatt.ar/nginx-ecowatt.conf /etc/nginx/sites-available/ecowatt.ar
sudo ln -sf /etc/nginx/sites-available/ecowatt.ar /etc/nginx/sites-enabled/ecowatt.ar
sudo nginx -t
sudo systemctl reload nginx
```

### DNS en tu proveedor (donde compraste `ecowatt.ar`)

Crear:
- `A` para `@` → `IP_PUBLICA_DEL_SERVIDOR`
- `A` para `www` → `IP_PUBLICA_DEL_SERVIDOR`

Esperar propagación (`dig ecowatt.ar +short`).

## 7) HTTPS con Let's Encrypt

```bash
sudo certbot --nginx -d ecowatt.ar -d www.ecowatt.ar --redirect -m tu-email@dominio.com --agree-tos -n
```

Chequeo renovación automática:

```bash
systemctl status certbot.timer
sudo certbot renew --dry-run
```

## 8) Verificación final

```bash
curl -I https://ecowatt.ar
curl -I https://ecowatt.ar/api/v1/devices
```

Logs:

```bash
journalctl -u ecowatt-backend -f
journalctl -u ecowatt-frontend -f
sudo tail -f /var/log/nginx/error.log
```

## 9) Deploy de nuevas versiones

```bash
cd /opt/ecowatt/app
git pull

# backend
cd /opt/ecowatt/app/backend
source .venv/bin/activate
pip install -r requirements.txt
deactivate
sudo systemctl restart ecowatt-backend

# frontend
cd /opt/ecowatt/app/frontend
npm ci
npm run build
sudo systemctl restart ecowatt-frontend
```

## 10) Checklist rápido

- [ ] DNS `@` y `www` apuntan al servidor
- [ ] `ecowatt-backend` activo en puerto `5000`
- [ ] `ecowatt-frontend` activo en puerto `3000`
- [ ] Nginx responde en `80/443`
- [ ] Certificado TLS vigente
- [ ] `/api/v1/*` responde por HTTPS
