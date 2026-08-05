import json
from urllib import error as urlerror
from urllib import parse as urlparse
from urllib import request as urlrequest

from . import _admin_auth_config


class SupabaseAdminError(RuntimeError):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def _supabase_admin_request(
    method: str,
    path: str,
    query: dict[str, object] | None = None,
    payload: dict | None = None,
):
    supabase_url, service_role_key = _admin_auth_config()
    if not supabase_url or not service_role_key:
        raise RuntimeError(
            "Supabase admin is not configured. Set SUPABASE_SERVICE_ROLE_KEY in backend env."
        )

    url = urlparse.urljoin(supabase_url.rstrip("/") + "/", path.lstrip("/"))
    if query:
        q = {
            k: str(v)
            for k, v in query.items()
            if v is not None and str(v).strip() != ""
        }
        if q:
            url += "?" + urlparse.urlencode(q)

    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")

    req = urlrequest.Request(
        url,
        method=method,
        data=data,
        headers={
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urlrequest.urlopen(req, timeout=10) as resp:
            raw = resp.read().decode("utf-8").strip()
            if not raw:
                return {}
            return json.loads(raw)
    except urlerror.HTTPError as e:
        raw = e.read().decode("utf-8", errors="ignore")
        message = f"Supabase admin request failed ({e.code})."
        if raw:
            try:
                parsed = json.loads(raw)
                message = (
                    parsed.get("msg")
                    or parsed.get("error_description")
                    or parsed.get("message")
                    or parsed.get("error")
                    or message
                )
            except Exception:
                message = raw
        raise SupabaseAdminError(e.code, message)


def _extract_supabase_admin_user(payload: object) -> dict | None:
    if not isinstance(payload, dict):
        return None

    nested = payload.get("user")
    if isinstance(nested, dict):
        return nested

    if isinstance(payload.get("id"), str):
        return payload

    return None
