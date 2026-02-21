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
```

Agregar en el bloque `http {}` de `/etc/nginx/nginx.conf` (antes del primer `server`):

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;
```

Crear el directorio webroot para ACME si no existe:

```bash
sudo mkdir -p /var/www/html
```

> ⚠️ **Primer despliegue:** La configuración incluye un bloque HTTPS que referencia certificados de Let's Encrypt. En el primer deploy esos archivos todavía no existen, por lo que `sudo nginx -t` fallará. No ejecutes el test ni el reload ahora; seguí los pasos del apartado 7.

### DNS en tu proveedor (donde compraste `ecowatt.ar`)

Crear:
- `A` para `@` → `IP_PUBLICA_DEL_SERVIDOR`
- `A` para `www` → `IP_PUBLICA_DEL_SERVIDOR`

Esperar propagación (`dig ecowatt.ar +short`).

## 7) HTTPS con Let's Encrypt

La configuración de Nginx incluida en `deploy/ecowatt.ar/nginx-ecowatt.conf` ya fuerza redirección `http -> https` y espera que existan los siguientes archivos antes de arrancar:

- `/etc/letsencrypt/live/ecowatt.ar/fullchain.pem`
- `/etc/letsencrypt/live/ecowatt.ar/privkey.pem`
- `/etc/letsencrypt/options-ssl-nginx.conf`
- `/etc/letsencrypt/ssl-dhparams.pem`

### Primer despliegue (bootstrap)

En el primer deploy esos archivos no existen todavía. Para resolver el orden de dependencia, pará Nginx brevemente, emití los certificados con el modo `--standalone` de Certbot (que levanta su propio servidor HTTP temporal en el puerto 80) y luego iniciá Nginx con la configuración completa:

```bash
# 1. Detener Nginx temporalmente para liberar el puerto 80
sudo systemctl stop nginx

# 2. Emitir certificados (Certbot usa su propio servidor en el puerto 80)
sudo certbot certonly --standalone -d ecowatt.ar -d www.ecowatt.ar \
    -m tu-email@dominio.com --agree-tos -n

# 3. Verificar la configuración completa (los certificados ahora existen) e iniciar Nginx
sudo nginx -t && sudo systemctl start nginx
```

### Renovaciones posteriores

Una vez que los certificados existen, la renovación automática se encarga de todo. Para renovar manualmente o verificar la renovación automática:

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
