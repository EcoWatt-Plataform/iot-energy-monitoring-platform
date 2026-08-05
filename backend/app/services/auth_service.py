import json
import time
import threading
from flask import current_app, jsonify, request
from urllib import error as urlerror
from urllib import parse as urlparse
from urllib import request as urlrequest

from . import _auth_config


def _extract_bearer_token() -> str:
    auth_header = (request.headers.get("Authorization") or "").strip()
    if not auth_header.lower().startswith("bearer "):
        return ""
    return auth_header[7:].strip()


# ---------------------------------------------------------------------------
# Simple in-process token cache with configurable TTL (default 60 s)
# ---------------------------------------------------------------------------
_TOKEN_CACHE_TTL = 60  # seconds
_TOKEN_CACHE_MAX_SIZE = 1000
_token_cache: dict[str, tuple[dict, float]] = {}
_token_cache_lock = threading.Lock()


def _cached_fetch_supabase_user(access_token: str) -> dict | None:
    """Return cached user dict or fetch from Supabase and cache the result."""
    now = time.monotonic()
    with _token_cache_lock:
        entry = _token_cache.get(access_token)
        if entry is not None:
            user, expires_at = entry
            if now < expires_at:
                return user
            # Expired – remove stale entry
            del _token_cache[access_token]

    user = _fetch_supabase_user(access_token)

    if user and user.get("id"):
        with _token_cache_lock:
            # Evict all expired entries if at capacity before inserting
            if len(_token_cache) >= _TOKEN_CACHE_MAX_SIZE:
                expired_keys = [k for k, (_, exp) in _token_cache.items() if now >= exp]
                for k in expired_keys:
                    del _token_cache[k]
                # If still at capacity after eviction, remove oldest entries
                if len(_token_cache) >= _TOKEN_CACHE_MAX_SIZE:
                    overflow = len(_token_cache) - _TOKEN_CACHE_MAX_SIZE + 1
                    for k in list(_token_cache.keys())[:overflow]:
                        del _token_cache[k]
            _token_cache[access_token] = (user, now + _TOKEN_CACHE_TTL)

    return user


def _fetch_supabase_user(access_token: str):
    if not access_token:
        return None

    supabase_url, supabase_anon_key = _auth_config()
    if not supabase_url or not supabase_anon_key:
        raise RuntimeError("Supabase auth is not configured on backend.")

    user_endpoint = urlparse.urljoin(supabase_url.rstrip("/") + "/", "auth/v1/user")
    req = urlrequest.Request(
        user_endpoint,
        headers={
            "apikey": supabase_anon_key,
            "Authorization": f"Bearer {access_token}",
        },
    )

    try:
        with urlrequest.urlopen(req, timeout=5) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
            return payload
    except urlerror.HTTPError as e:
        if e.code in (401, 403):
            return None
        raise


def _require_user():
    token = _extract_bearer_token()
    if not token:
        return None, (jsonify({"error": "Missing bearer token"}), 401)

    try:
        user = _cached_fetch_supabase_user(token)
    except RuntimeError as e:
        return None, (jsonify({"error": str(e)}), 500)
    except Exception:
        return None, (jsonify({"error": "Could not validate Supabase token"}), 500)

    if not user or not user.get("id"):
        return None, (jsonify({"error": "Invalid or expired token"}), 401)

    return user, None


def _is_admin_user(user: dict) -> bool:
    settings = current_app.config["SETTINGS"]
    email = str(user.get("email") or "").strip().lower()

    if email and email in settings.admin_emails:
        return True

    app_meta = user.get("app_metadata") or {}
    if not isinstance(app_meta, dict):
        app_meta = {}

    role = str(app_meta.get("role") or "").strip().lower()
    if role in {"admin", "superadmin"}:
        return True

    return bool(app_meta.get("is_admin"))


def _require_admin():
    user, auth_error = _require_user()
    if auth_error:
        return None, auth_error

    if not _is_admin_user(user):
        return None, (jsonify({"error": "Admin access required"}), 403)

    return user, None
