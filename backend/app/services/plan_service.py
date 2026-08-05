from datetime import datetime
from flask import jsonify, request

from .auth_service import _is_admin_user
from .supabase_client import SupabaseAdminError, _supabase_admin_request, _extract_supabase_admin_user
from . import _clean_optional_text, _normalize_document_type


_PLAN_ALIASES: dict[str, str] = {
    "premium": "premium",
    "plan_premium": "premium",
    "pro": "premium",
    "avanzado": "avanzado",
    "advanced": "avanzado",
    "plan_avanzado": "avanzado",
}
_PLAN_METADATA_KEYS = ("plan", "subscription_plan", "subscription", "tier", "plan_name")

_CHECKOUT_PLAN_RULES: dict[str, dict[str, float | int]] = {
    "basico": {"max_meters": 1, "plan_price_ars": 7900},
    "avanzado": {"max_meters": 3, "plan_price_ars": 12900},
    "premium": {"max_meters": 6, "plan_price_ars": 19900},
}

_CHECKOUT_METER_PRICES: dict[str, int] = {
    "plug": 49900,
    "panel_1f": 149900,
    "panel_3f": 219900,
    "extra_phase": 34900,
}


def _normalize_plan(value: object) -> str:
    """Return canonical plan name from a raw metadata value."""
    raw = str(value or "").strip().lower()
    return _PLAN_ALIASES.get(raw, "basico")


def _normalize_role(value: object) -> str:
    raw = str(value or "").strip().lower()
    return "admin" if raw in {"admin", "superadmin"} else "user"


def _address_from_user_meta(user_meta: dict) -> str | None:
    parts: list[str] = []
    explicit = _clean_optional_text(user_meta.get("address"))
    if explicit:
        parts.append(explicit)

    for key in ("locality", "province", "country"):
        value = _clean_optional_text(user_meta.get(key))
        if value and value not in parts:
            parts.append(value)

    if not parts:
        return None
    return ", ".join(parts)


def _plan_from_user(user: dict) -> str:
    """Extract the subscription plan from a Supabase user object."""
    meta = user.get("user_metadata") or {}
    if not isinstance(meta, dict):
        meta = {}
    for key in _PLAN_METADATA_KEYS:
        if key in meta:
            return _normalize_plan(meta[key])
    return "basico"


def _plan_device_limit(plan: str) -> int | None:
    if plan == "basico":
        return 1
    if plan == "avanzado":
        return 3
    if plan == "premium":
        return 6
    return None


def _plan_history_months(plan: str) -> int | None:
    if plan == "basico":
        return 3
    if plan == "avanzado":
        return 12
    return None


def _history_min_month(history_months: int) -> str:
    months = max(1, int(history_months))
    now = datetime.utcnow()
    year = now.year
    month = now.month - (months - 1)
    while month <= 0:
        month += 12
        year -= 1
    return f"{year:04d}-{month:02d}"


def _enforce_month_history_limit(plan: str, month: str):
    history_months = _plan_history_months(plan)
    if history_months is None:
        return None

    min_month = _history_min_month(history_months)
    if month < min_month:
        return jsonify({
            "error": (
                f"Plan {plan.capitalize()} allows up to {history_months} months of history. "
                f"Minimum allowed month: {min_month}"
            )
        }), 403
    return None


def _enforce_date_history_limit(plan: str, date_from: str, date_to: str):
    history_months = _plan_history_months(plan)
    if history_months is None:
        return None

    min_month = _history_min_month(history_months)
    from_month = date_from[:7]
    to_month = date_to[:7]
    if from_month < min_month or to_month < min_month:
        return jsonify({
            "error": (
                f"Plan {plan.capitalize()} allows up to {history_months} months of history. "
                f"Minimum allowed month: {min_month}"
            )
        }), 403
    return None


def _resolve_owner_user_id(actor_user: dict):
    requested_user_id = str(request.args.get("as_user_id") or "").strip()
    if not requested_user_id:
        return str(actor_user.get("id") or ""), None

    if not _is_admin_user(actor_user):
        return None, (jsonify({"error": "Admin access required for as_user_id"}), 403)

    return requested_user_id, None


def _resolve_owner_plan(actor_user: dict, owner_user_id: str):
    actor_id = str(actor_user.get("id") or "")
    if owner_user_id == actor_id:
        return _plan_from_user(actor_user), None

    try:
        payload = _supabase_admin_request("GET", f"auth/v1/admin/users/{owner_user_id}")
    except RuntimeError as e:
        return "", (jsonify({"error": str(e)}), 500)
    except SupabaseAdminError as e:
        return "", (jsonify({"error": e.message}), e.status)

    target_user = _extract_supabase_admin_user(payload)
    if not isinstance(target_user, dict):
        return "", (jsonify({"error": "target user not found"}), 404)

    return _plan_from_user(target_user), None


def _serialize_admin_user(raw_user: dict, device_counts: dict[str, int]) -> dict:
    user_meta = raw_user.get("user_metadata") or {}
    if not isinstance(user_meta, dict):
        user_meta = {}

    app_meta = raw_user.get("app_metadata") or {}
    if not isinstance(app_meta, dict):
        app_meta = {}

    user_id = str(raw_user.get("id") or "")
    role = _normalize_role(app_meta.get("role"))
    is_admin = role == "admin" or bool(app_meta.get("is_admin"))
    document_type = _normalize_document_type(user_meta.get("document_type"))
    document_number = _clean_optional_text(user_meta.get("document_number"))
    phone = _clean_optional_text(user_meta.get("phone"))
    birth_date = _clean_optional_text(user_meta.get("birth_date"))
    locality = _clean_optional_text(user_meta.get("locality"))
    province = _clean_optional_text(user_meta.get("province"))
    country = _clean_optional_text(user_meta.get("country"))
    address = _address_from_user_meta(user_meta)

    return {
        "id": user_id,
        "email": str(raw_user.get("email") or ""),
        "created_at": raw_user.get("created_at"),
        "last_sign_in_at": raw_user.get("last_sign_in_at"),
        "email_confirmed_at": raw_user.get("email_confirmed_at"),
        "full_name": (
            user_meta.get("full_name")
            or user_meta.get("name")
            or f"{user_meta.get('first_name', '')} {user_meta.get('last_name', '')}".strip()
            or None
        ),
        "plan": _plan_from_user({"user_metadata": user_meta}),
        "role": role,
        "is_admin": is_admin,
        "device_count": int(device_counts.get(user_id, 0)),
        "document_type": document_type,
        "document_number": document_number,
        "dni": document_number if document_type == "DNI" else None,
        "cuit": document_number if document_type == "CUIT" else None,
        "phone": phone,
        "birth_date": birth_date,
        "locality": locality,
        "province": province,
        "country": country,
        "address": address,
    }
