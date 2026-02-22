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
CURL_TIMEOUT="${CURL_TIMEOUT:-10}"
HEALTH_RETRIES="${HEALTH_RETRIES:-12}"
HEALTH_RETRY_DELAY="${HEALTH_RETRY_DELAY:-2}"

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

code_in_list() {
  local code="$1"
  shift
  local candidate
  for candidate in "$@"; do
    if [[ "${code}" == "${candidate}" ]]; then
      return 0
    fi
  done
  return 1
}

request_http_code() {
  local method="$1"
  local url="$2"
  local outfile="$3"
  local payload="${4:-}"
  local code

  if [[ -n "${payload}" ]]; then
    code="$(curl -sS --max-time "${CURL_TIMEOUT}" -X "${method}" \
      -H "Content-Type: application/json" \
      -o "${outfile}" -w "%{http_code}" \
      "${url}" --data "${payload}" || true)"
  else
    code="$(curl -sS --max-time "${CURL_TIMEOUT}" -X "${method}" \
      -o "${outfile}" -w "%{http_code}" \
      "${url}" || true)"
  fi

  if [[ -z "${code}" ]]; then
    code="000"
  fi
  echo "${code}"
}

wait_for_http_codes() {
  local label="$1"
  local method="$2"
  local url="$3"
  local outfile="$4"
  local payload="$5"
  shift 5
  local expected_codes=("$@")
  local code="000"
  local attempt=1

  while (( attempt <= HEALTH_RETRIES )); do
    code="$(request_http_code "${method}" "${url}" "${outfile}" "${payload}")"
    if code_in_list "${code}" "${expected_codes[@]}"; then
      echo "${code}"
      return 0
    fi
    if (( attempt < HEALTH_RETRIES )); then
      sleep "${HEALTH_RETRY_DELAY}"
    fi
    ((attempt++))
  done

  echo "ERROR: ${label} failed (HTTP ${code}; expected: ${expected_codes[*]})"
  if [[ -f "${outfile}" ]]; then
    cat "${outfile}"
  fi
  return 1
}

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
LOCAL_HEALTH_CODE="$(wait_for_http_codes \
  "local backend /health" \
  "GET" \
  "http://127.0.0.1:5000/health" \
  "/tmp/ecowatt_local_health.json" \
  "" \
  "200")"
echo "    local backend /health: HTTP ${LOCAL_HEALTH_CODE}"

API_HEALTH_CODE="$(wait_for_http_codes \
  "public API /api/v1/health" \
  "GET" \
  "${PUBLIC_BASE_URL}/api/v1/health" \
  "/tmp/ecowatt_api_health.json" \
  "" \
  "200")"
echo "    public API /api/v1/health: HTTP ${API_HEALTH_CODE}"

CHECKOUT_PROBE_PAYLOAD='{}'
LOCAL_CHECKOUT_CODE="$(wait_for_http_codes \
  "local backend POST /api/v1/checkout/request (probe)" \
  "POST" \
  "http://127.0.0.1:5000/api/v1/checkout/request" \
  "/tmp/ecowatt_local_checkout_probe.json" \
  "${CHECKOUT_PROBE_PAYLOAD}" \
  "400" "429")"
if [[ "${LOCAL_CHECKOUT_CODE}" == "429" ]]; then
  echo "    WARN: local checkout probe hit rate limit (HTTP ${LOCAL_CHECKOUT_CODE})"
else
  echo "    local backend POST /api/v1/checkout/request: HTTP ${LOCAL_CHECKOUT_CODE}"
fi

PUBLIC_CHECKOUT_CODE="$(wait_for_http_codes \
  "public API POST /api/v1/checkout/request (probe)" \
  "POST" \
  "${PUBLIC_BASE_URL}/api/v1/checkout/request" \
  "/tmp/ecowatt_public_checkout_probe.json" \
  "${CHECKOUT_PROBE_PAYLOAD}" \
  "400" "429")"
if [[ "${PUBLIC_CHECKOUT_CODE}" == "429" ]]; then
  echo "    WARN: public checkout probe hit rate limit (HTTP ${PUBLIC_CHECKOUT_CODE})"
else
  echo "    public API POST /api/v1/checkout/request: HTTP ${PUBLIC_CHECKOUT_CODE}"
fi

ADMIN_LOGIN_CODE="$(wait_for_http_codes \
  "public /admin/login" \
  "GET" \
  "${PUBLIC_BASE_URL}/admin/login" \
  "/tmp/ecowatt_admin_login.html" \
  "" \
  "200")"
echo "    public /admin/login: HTTP ${ADMIN_LOGIN_CODE}"
echo

echo "==> Deploy OK (${COMMIT_SHA})"
