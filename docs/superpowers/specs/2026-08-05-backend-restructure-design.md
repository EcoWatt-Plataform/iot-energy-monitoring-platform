# Backend Restructure: Split routes.py into routes/ + services/

**Date:** 2026-08-05
**Status:** Approved
**Scope:** Backend only (frontend restructure to follow separately)

## Problem

`backend/app/routes.py` is a single 2,072-line file that mixes 6+ domains: auth, checkout, admin, devices, ingest/measurements, metrics, and CSV export. This makes it hard to navigate, reason about, and maintain.

## Approach

Split into two layers:
- **`routes/`** — thin HTTP handlers (parse request, call service, return response)
- **`services/`** — business logic, SQL queries, external API calls, validation

No code logic changes. Pure structural refactor — move functions to their new homes and adjust imports.

## Target Structure

```
backend/app/
├── __init__.py          # create_app() — update import: from .routes import api_bp, web_bp
├── __main__.py          # no changes
├── config.py            # no changes
├── db.py                # no changes
├── seed.py              # no changes
├── schema.sql           # no changes
├── static/              # no changes
├── templates/           # no changes
│
├── services/
│   ├── __init__.py          # shared helpers: _db_path(), _auth_config(), _admin_auth_config()
│   ├── auth_service.py      # token cache, Supabase user fetch, _require_user, _require_admin
│   ├── supabase_client.py   # SupabaseAdminError, _supabase_admin_request, _extract_supabase_admin_user
│   ├── plan_service.py      # plan constants, normalization, limits, history enforcement
│   ├── checkout_service.py  # rate limiter, checkout validation, create checkout request
│   ├── device_service.py    # CRUD devices in SQLite
│   ├── metrics_service.py   # summary_month and daily metric queries
│   └── export_service.py    # CSV generation (measurements, daily, alerts)
│
├── routes/
│   ├── __init__.py          # creates api_bp and web_bp, imports all route modules
│   ├── health.py            # GET / and GET /health (both blueprints)
│   ├── checkout.py          # POST /checkout/request
│   ├── admin.py             # /admin/* endpoints
│   ├── devices.py           # /devices CRUD
│   ├── ingest.py            # POST /measurements
│   ├── metrics.py           # /metrics/summary_month, /metrics/daily
│   └── export.py            # /export/*.csv
```

## Service Details

### services/__init__.py
Shared config accessors used by multiple services:
- `_db_path()` — reads `current_app.config["SETTINGS"].db_path`
- `_auth_config()` — returns `(supabase_url, supabase_anon_key)`
- `_admin_auth_config()` — returns `(supabase_url, supabase_service_role_key)`

### services/auth_service.py (~130 lines)
Source: routes.py lines 28-143

Contains:
- `_extract_bearer_token()` — extracts Bearer token from Authorization header
- Token cache: `_TOKEN_CACHE_TTL`, `_TOKEN_CACHE_MAX_SIZE`, `_token_cache`, `_token_cache_lock`
- `_cached_fetch_supabase_user(access_token)` — cached Supabase user lookup
- `_fetch_supabase_user(access_token)` — HTTP call to Supabase `/auth/v1/user`
- `_require_user()` — returns `(user, error_response)` tuple
- `_is_admin_user(user)` — checks admin_emails config + app_metadata.role
- `_require_admin()` — combines _require_user + _is_admin_user

Dependencies: `services.__init__._auth_config`

### services/supabase_client.py (~100 lines)
Source: routes.py lines 146-225

Contains:
- `SupabaseAdminError(RuntimeError)` — exception with status and message
- `_supabase_admin_request(method, path, query, payload)` — generic HTTP against Supabase Admin API
- `_extract_supabase_admin_user(payload)` — normalizes Supabase response to user dict

Dependencies: `services.__init__._admin_auth_config`

### services/plan_service.py (~130 lines)
Source: routes.py lines 239-410

Contains:
- Constants: `_PLAN_ALIASES`, `_PLAN_METADATA_KEYS`, `_CHECKOUT_PLAN_RULES`, `_CHECKOUT_METER_PRICES`
- `_normalize_plan(value)` — canonical plan name from raw metadata
- `_normalize_role(value)` — "admin" or "user"
- `_plan_from_user(user)` — extract plan from Supabase user object
- `_plan_device_limit(plan)` — max devices per plan
- `_plan_history_months(plan)` — months of history per plan
- `_history_min_month(history_months)` — earliest allowed month
- `_enforce_month_history_limit(plan, month)` — returns error response or None
- `_enforce_date_history_limit(plan, date_from, date_to)` — returns error response or None
- `_resolve_owner_user_id(actor_user)` — impersonation logic for as_user_id
- `_resolve_owner_plan(actor_user, owner_user_id)` — resolves plan, fetching from Supabase if impersonating

Dependencies: `supabase_client._supabase_admin_request`, `supabase_client._extract_supabase_admin_user`

### services/checkout_service.py (~200 lines)
Source: routes.py lines 262-739

Contains:
- Rate limiter state: `_CHECKOUT_RATE_LIMIT`, `_CHECKOUT_RATE_WINDOW`, `_CHECKOUT_MAX_IPS`, `_checkout_ip_timestamps`, `_checkout_rate_lock`
- `check_rate_limit(client_ip)` — sliding window rate limiter, returns error response or None
- Validation helpers: `_is_valid_email()`, `_clean_optional_text()`, `_normalize_document_type()`
- `validate_and_create_checkout(data, client_ip, db_path)` — validates input, computes pricing, INSERT + idempotency handling, returns response tuple

Dependencies: `services.__init__._db_path`, `plan_service._CHECKOUT_PLAN_RULES`, `plan_service._CHECKOUT_METER_PRICES`

### services/device_service.py (~100 lines)
Source: routes.py lines 1279-1464

Contains:
- `create_device(owner_user_id, owner_email, name, threshold, plan, db_path)` — checks plan limit, generates api_key, INSERT
- `list_devices(owner_user_id, db_path)` — SELECT ordered by id
- `update_device(device_id, owner_user_id, data, db_path)` — partial UPDATE (name, threshold)
- `delete_device(device_id, owner_user_id, db_path)` — DELETE device + measurements

Dependencies: `services.__init__._db_path`, `plan_service._plan_device_limit`

### services/metrics_service.py (~150 lines)
Source: routes.py lines 1525-1749

Contains:
- `get_summary_month(owner_user_id, month, device_id, db_path)` — complex query with per-device stats, alert detection, threshold crossing timestamps
- `get_daily_metrics(device_id, owner_user_id, date_from, date_to, db_path)` — daily aggregation query

Dependencies: `services.__init__._db_path`

### services/export_service.py (~150 lines)
Source: routes.py lines 1753-2073

Contains:
- `export_measurements_csv(owner_user_id, month, device_id, db_path)` — returns CSV string
- `export_daily_csv(owner_user_id, month, device_id, db_path)` — returns CSV string
- `export_alerts_csv(owner_user_id, month, device_id, db_path)` — returns CSV string

Dependencies: `services.__init__._db_path`

## Route Details

### routes/__init__.py (~15 lines)
Creates `api_bp` and `web_bp` Blueprint instances, then imports all route modules to register their decorators:
```python
from flask import Blueprint
api_bp = Blueprint("api", __name__, url_prefix="/api/v1")
web_bp = Blueprint("web", __name__)
from . import health, checkout, admin, devices, ingest, metrics, export
```

### routes/health.py (~15 lines)
- `@web_bp.get("/")` → renders index.html
- `@web_bp.get("/health")` → health check
- `@api_bp.get("/health")` → API health check

### routes/checkout.py (~30 lines)
- `@api_bp.post("/checkout/request")` → delegates to `checkout_service.validate_and_create_checkout()`

### routes/admin.py (~300 lines)
This is the largest route file because admin endpoints have significant request parsing (pagination, filters, user metadata updates). Contains:
- `@api_bp.get("/admin/me")`
- `@api_bp.get("/admin/users")` — pagination, search, sorting
- `@api_bp.get("/admin/checkout-requests")` — pagination, status filter
- `@api_bp.patch("/admin/checkout-requests/<id>")` — status update
- `@api_bp.post("/admin/users")` — create user via Supabase Admin
- `@api_bp.patch("/admin/users/<id>")` — update user metadata/role/plan
- `@api_bp.delete("/admin/users/<id>")` — delete user + their devices

Admin routes have the most inline logic because they orchestrate multiple services (supabase_client, plan_service, device counts). Some of this orchestration stays in the route handlers since it's request-specific.

### routes/devices.py (~80 lines)
- `@api_bp.post("/devices")` → `device_service.create_device()`
- `@api_bp.get("/devices")` → `device_service.list_devices()`
- `@api_bp.patch("/devices/<id>")` → `device_service.update_device()`
- `@api_bp.delete("/devices/<id>")` → `device_service.delete_device()`

### routes/ingest.py (~55 lines)
- `@api_bp.post("/measurements")` → validates API key, inserts measurement
  Note: This endpoint uses X-API-Key auth (not Bearer), so it does NOT use auth_service. The logic is self-contained and small enough to stay inline.

### routes/metrics.py (~50 lines)
- `@api_bp.get("/metrics/summary_month")` → auth + plan check + `metrics_service.get_summary_month()`
- `@api_bp.get("/metrics/daily")` → auth + plan check + `metrics_service.get_daily_metrics()`

### routes/export.py (~50 lines)
- `@api_bp.get("/export/measurements.csv")` → auth + premium check + `export_service.export_measurements_csv()`
- `@api_bp.get("/export/daily.csv")` → auth + premium check + `export_service.export_daily_csv()`
- `@api_bp.get("/export/alerts.csv")` → auth + premium check + `export_service.export_alerts_csv()`

## Changes to Existing Files

### backend/app/__init__.py
Only change: the import stays the same (`from .routes import api_bp, web_bp`) because `routes/__init__.py` re-exports them.

### admin helpers that stay shared
- `_serialize_admin_user()` (lines 425-472) moves to `plan_service.py` since it uses `_normalize_role`, `_plan_from_user`, `_clean_optional_text`, etc.
- `_device_counts_by_owner()` (lines 412-422) moves to `device_service.py` since it queries the devices table.
- `_address_from_user_meta()` (lines 303-316) moves to `plan_service.py` alongside other user metadata helpers.

## Migration Strategy

1. Create `services/` package with all service files
2. Create `routes/` package with all route files
3. Delete `routes.py`
4. Update `__init__.py` import if needed (likely no change needed)
5. Run existing tests to verify nothing broke

## What Does NOT Change

- No logic changes — pure code movement
- No new dependencies
- No API contract changes (same endpoints, same request/response formats)
- `db.py`, `config.py`, `seed.py`, `schema.sql` — untouched
- `backend/tools/` — untouched
- Frontend — separate spec
