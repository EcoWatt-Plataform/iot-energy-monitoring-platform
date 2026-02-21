#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./deploy.sh               # deploy branch main
#   ./deploy.sh develop       # deploy branch develop
# Optional env vars:
#   APP_DIR=/opt/ecowatt/app
#   REMOTE=origin
#   PUBLIC_BASE_URL=https://ecowatt.ar

BRANCH="${1:-main}"
APP_DIR="${APP_DIR:-/opt/ecowatt/app}"
REMOTE="${REMOTE:-origin}"
PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-https://ecowatt.ar}"

BACKEND_DIR="${APP_DIR}/backend"
FRONTEND_DIR="${APP_DIR}/frontend"

if [[ ! -d "${APP_DIR}/.git" ]]; then
  echo "ERROR: ${APP_DIR} is not a git repository."
  exit 1
fi

if [[ ! -f "${FRONTEND_DIR}/package.json" ]]; then
  echo "ERROR: frontend package.json not found in ${FRONTEND_DIR}."
  exit 1
fi

if [[ ! -f "${BACKEND_DIR}/requirements.txt" ]]; then
  echo "ERROR: backend requirements.txt not found in ${BACKEND_DIR}."
  exit 1
fi

if [[ $EUID -ne 0 ]]; then
  if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
  else
    echo "ERROR: run as root or install sudo."
    exit 1
  fi
else
  SUDO=""
fi

echo "==> Deploy start"
echo "    branch: ${BRANCH}"
echo "    app:    ${APP_DIR}"
echo "    remote: ${REMOTE}"
echo

cd "${APP_DIR}"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "ERROR: repository has uncommitted changes in ${APP_DIR}."
  echo "       commit/stash/revert them before deploy."
  exit 1
fi

echo "==> Updating repository"
git fetch "${REMOTE}"
git checkout "${BRANCH}"
git pull --ff-only "${REMOTE}" "${BRANCH}"
COMMIT_SHA="$(git rev-parse --short HEAD)"
echo "    deployed commit: ${COMMIT_SHA}"
echo

echo "==> Backend dependencies"
cd "${BACKEND_DIR}"
if [[ ! -d ".venv" ]]; then
  python3 -m venv .venv
fi
"${BACKEND_DIR}/.venv/bin/pip" install --disable-pip-version-check -r requirements.txt
echo

echo "==> Frontend install + build"
cd "${FRONTEND_DIR}"
npm ci
npm run build
echo

echo "==> Restarting services"
${SUDO} systemctl restart ecowatt-backend
${SUDO} systemctl restart ecowatt-frontend
${SUDO} systemctl reload nginx
echo

echo "==> Service checks"
${SUDO} systemctl is-active --quiet ecowatt-backend
echo "    ecowatt-backend: active"
${SUDO} systemctl is-active --quiet ecowatt-frontend
echo "    ecowatt-frontend: active"
${SUDO} systemctl is-active --quiet nginx
echo "    nginx: active"
echo

echo "==> Health checks"
LOCAL_HEALTH_CODE="$(curl -sS -o /tmp/ecowatt_local_health.json -w "%{http_code}" "http://127.0.0.1:5000/health")"
if [[ "${LOCAL_HEALTH_CODE}" != "200" ]]; then
  echo "ERROR: local backend health failed (HTTP ${LOCAL_HEALTH_CODE})"
  cat /tmp/ecowatt_local_health.json
  exit 1
fi
echo "    local backend /health: HTTP ${LOCAL_HEALTH_CODE}"

API_HEALTH_CODE="$(curl -sS -o /tmp/ecowatt_api_health.json -w "%{http_code}" "${PUBLIC_BASE_URL}/api/v1/health")"
if [[ "${API_HEALTH_CODE}" != "200" ]]; then
  echo "ERROR: public API health failed (HTTP ${API_HEALTH_CODE})"
  cat /tmp/ecowatt_api_health.json
  exit 1
fi
echo "    public API /api/v1/health: HTTP ${API_HEALTH_CODE}"

ADMIN_LOGIN_CODE="$(curl -sS -I -o /tmp/ecowatt_admin_login.headers -w "%{http_code}" "${PUBLIC_BASE_URL}/admin/login")"
if [[ "${ADMIN_LOGIN_CODE}" != "200" ]]; then
  echo "ERROR: admin login page failed (HTTP ${ADMIN_LOGIN_CODE})"
  cat /tmp/ecowatt_admin_login.headers
  exit 1
fi
echo "    public /admin/login: HTTP ${ADMIN_LOGIN_CODE}"
echo

echo "==> Deploy OK (${COMMIT_SHA})"
