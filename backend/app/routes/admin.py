import sqlite3
from flask import jsonify, request

from . import api_bp
from ..db import get_con
from ..services import _db_path, _is_valid_email, _clean_optional_text, _normalize_document_type
from ..services.auth_service import _require_admin
from ..services.supabase_client import SupabaseAdminError, _supabase_admin_request, _extract_supabase_admin_user
from ..services.plan_service import (
    _normalize_plan,
    _normalize_role,
    _serialize_admin_user,
    _plan_from_user,
)
from ..services.checkout_service import _CHECKOUT_REQUEST_STATUSES
from ..services.device_service import _device_counts_by_owner


def _serialize_checkout_request(row: sqlite3.Row) -> dict:
    return {
        "id": int(row["id"]),
        "status": str(row["status"]),
        "plan": str(row["plan"]),
        "plan_price_ars": int(row["plan_price_ars"]),
        "max_meters": int(row["max_meters"]),
        "plug_qty": int(row["plug_qty"]),
        "panel_qty": int(row["panel_qty"]),
        "panel_1f_qty": int(row["panel_1f_qty"]),
        "panel_3f_qty": int(row["panel_3f_qty"]),
        "extra_phase_qty": int(row["extra_phase_qty"]),
        "meters_total": int(row["plug_qty"]) + int(row["panel_qty"]),
        "hardware_total_ars": int(row["hardware_total_ars"]),
        "total_ars": int(row["total_ars"]),
        "buyer_full_name": str(row["buyer_full_name"]),
        "buyer_phone": str(row["buyer_phone"]),
        "buyer_email": str(row["buyer_email"]),
        "buyer_document_type": str(row["buyer_document_type"]).upper(),
        "buyer_document_number": str(row["buyer_document_number"]),
        "buyer_address": str(row["buyer_address"]),
        "property_type": str(row["property_type"]),
        "idempotency_key": row["idempotency_key"],
        "created_at": row["created_at"],
    }


@api_bp.get("/admin/me")
def admin_me():
    user, auth_error = _require_admin()
    if auth_error:
        return auth_error

    return jsonify({
        "id": user.get("id"),
        "email": user.get("email"),
        "is_admin": True,
    })


@api_bp.get("/admin/users")
def admin_list_users():
    _, auth_error = _require_admin()
    if auth_error:
        return auth_error

    page = request.args.get("page", default=1, type=int) or 1
    per_page = request.args.get("per_page", default=100, type=int) or 100
    search = (request.args.get("search") or "").strip().lower()

    page = max(1, page)
    per_page = min(200, max(1, per_page))

    try:
        payload = _supabase_admin_request(
            "GET",
            "auth/v1/admin/users",
            query={"page": page, "per_page": per_page},
        )
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 500
    except SupabaseAdminError as e:
        return jsonify({"error": e.message}), e.status

    users = payload.get("users")
    if not isinstance(users, list):
        users = []

    device_counts = _device_counts_by_owner()
    out = [
        _serialize_admin_user(raw, device_counts)
        for raw in users
        if isinstance(raw, dict)
    ]

    if search:
        out = [
            u for u in out
            if search in str(u.get("email", "")).lower()
            or search in str(u.get("full_name", "")).lower()
            or search in str(u.get("id", "")).lower()
            or search in str(u.get("document_number", "")).lower()
            or search in str(u.get("dni", "")).lower()
            or search in str(u.get("cuit", "")).lower()
            or search in str(u.get("phone", "")).lower()
        ]

    return jsonify({
        "users": out,
        "page": page,
        "per_page": per_page,
        "total": payload.get("total", len(out)),
    })


@api_bp.get("/admin/checkout-requests")
def admin_list_checkout_requests():
    _, auth_error = _require_admin()
    if auth_error:
        return auth_error

    raw_status = str(request.args.get("status") or "").strip().lower()
    search = str(request.args.get("search") or "").strip().lower()
    limit = request.args.get("limit", default=200, type=int) or 200
    limit = min(500, max(1, limit))

    status_filter: str | None = None
    if raw_status and raw_status != "all":
        if raw_status not in _CHECKOUT_REQUEST_STATUSES:
            return jsonify({
                "error": "status must be all, pendiente, contactado, cerrado or descartado"
            }), 400
        status_filter = raw_status

    where_parts: list[str] = []
    params: list[object] = []
    if status_filter:
        where_parts.append("status = ?")
        params.append(status_filter)
    if search:
        like = f"%{search}%"
        where_parts.append(
            "("
            "CAST(id AS TEXT) LIKE ? OR "
            "lower(buyer_full_name) LIKE ? OR "
            "lower(buyer_email) LIKE ? OR "
            "lower(buyer_phone) LIKE ? OR "
            "lower(buyer_document_number) LIKE ? OR "
            "lower(buyer_address) LIKE ?"
            ")"
        )
        params.extend([like, like, like, like, like, like])

    where_sql = f"WHERE {' AND '.join(where_parts)}" if where_parts else ""
    query = f"""
        SELECT
            id,
            status,
            plan,
            plan_price_ars,
            max_meters,
            plug_qty,
            panel_qty,
            panel_1f_qty,
            panel_3f_qty,
            extra_phase_qty,
            hardware_total_ars,
            total_ars,
            buyer_full_name,
            buyer_phone,
            buyer_email,
            buyer_document_type,
            buyer_document_number,
            buyer_address,
            property_type,
            idempotency_key,
            created_at
        FROM checkout_requests
        {where_sql}
        ORDER BY datetime(created_at) DESC, id DESC
        LIMIT ?
    """
    params.append(limit)

    with get_con(_db_path()) as con:
        rows = con.execute(query, tuple(params)).fetchall()

    out = [_serialize_checkout_request(row) for row in rows]
    return jsonify({
        "requests": out,
        "total": len(out),
        "limit": limit,
        "status": status_filter or "all",
    })


@api_bp.patch("/admin/checkout-requests/<int:request_id>")
def admin_update_checkout_request(request_id: int):
    _, auth_error = _require_admin()
    if auth_error:
        return auth_error

    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict):
        return jsonify({"error": "invalid JSON payload"}), 400

    status = str(data.get("status") or "").strip().lower()
    if status not in _CHECKOUT_REQUEST_STATUSES:
        return jsonify({
            "error": "status must be pendiente, contactado, cerrado or descartado"
        }), 400

    with get_con(_db_path()) as con:
        exists = con.execute(
            "SELECT id FROM checkout_requests WHERE id = ?",
            (request_id,),
        ).fetchone()
        if exists is None:
            return jsonify({"error": "checkout request not found"}), 404

        con.execute(
            "UPDATE checkout_requests SET status = ? WHERE id = ?",
            (status, request_id),
        )
        row = con.execute(
            """
            SELECT
                id,
                status,
                plan,
                plan_price_ars,
                max_meters,
                plug_qty,
                panel_qty,
                panel_1f_qty,
                panel_3f_qty,
                extra_phase_qty,
                hardware_total_ars,
                total_ars,
                buyer_full_name,
                buyer_phone,
                buyer_email,
                buyer_document_type,
                buyer_document_number,
                buyer_address,
                property_type,
                idempotency_key,
                created_at
            FROM checkout_requests
            WHERE id = ?
            LIMIT 1
            """,
            (request_id,),
        ).fetchone()

    if row is None:
        return jsonify({"error": "checkout request not found"}), 404
    return jsonify(_serialize_checkout_request(row))


@api_bp.post("/admin/users")
def admin_create_user():
    _, auth_error = _require_admin()
    if auth_error:
        return auth_error

    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict):
        return jsonify({"error": "invalid JSON payload"}), 400

    email = str(data.get("email") or "").strip().lower()
    if not email or not _is_valid_email(email):
        return jsonify({"error": "valid email is required"}), 400

    password = str(data.get("password") or "")
    if len(password) < 6:
        return jsonify({"error": "password must have at least 6 characters"}), 400

    full_name = data.get("full_name")
    if full_name is not None:
        full_name = str(full_name).strip() or None

    document_type = _normalize_document_type(data.get("document_type"))
    document_number = _clean_optional_text(data.get("document_number"))
    phone = _clean_optional_text(data.get("phone"))
    birth_date = _clean_optional_text(data.get("birth_date"))
    locality = _clean_optional_text(data.get("locality"))
    province = _clean_optional_text(data.get("province"))
    country = _clean_optional_text(data.get("country"))
    address = _clean_optional_text(data.get("address"))

    if "document_type" in data and document_type is None and _clean_optional_text(data.get("document_type")):
        return jsonify({"error": "document_type must be 'DNI' or 'CUIT'"}), 400

    plan = _normalize_plan(data.get("plan"))
    role = _normalize_role(data.get("role"))
    email_confirm = bool(data.get("email_confirm", True))

    user_meta: dict[str, object] = {"plan": plan}
    if full_name:
        user_meta["full_name"] = full_name
        user_meta["name"] = full_name
    if document_type:
        user_meta["document_type"] = document_type
    if document_number:
        user_meta["document_number"] = document_number
    if phone:
        user_meta["phone"] = phone
    if birth_date:
        user_meta["birth_date"] = birth_date
    if locality:
        user_meta["locality"] = locality
    if province:
        user_meta["province"] = province
    if country:
        user_meta["country"] = country
    if address:
        user_meta["address"] = address

    app_meta = {"role": role, "is_admin": role == "admin"}

    try:
        created_payload = _supabase_admin_request(
            "POST",
            "auth/v1/admin/users",
            payload={
                "email": email,
                "password": password,
                "email_confirm": email_confirm,
                "user_metadata": user_meta,
                "app_metadata": app_meta,
            },
        )
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 500
    except SupabaseAdminError as e:
        return jsonify({"error": e.message}), e.status

    created_user = _extract_supabase_admin_user(created_payload)
    if not isinstance(created_user, dict):
        return jsonify({"error": "unexpected admin response"}), 502

    device_counts = _device_counts_by_owner()
    return jsonify(_serialize_admin_user(created_user, device_counts)), 201


@api_bp.patch("/admin/users/<user_id>")
def admin_update_user(user_id: str):
    _, auth_error = _require_admin()
    if auth_error:
        return auth_error

    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict):
        return jsonify({"error": "invalid JSON payload"}), 400

    plan = data.get("plan")
    role = data.get("role")
    full_name = data.get("full_name")
    email = data.get("email")
    password = data.get("password")
    has_document_type = "document_type" in data
    document_type = _normalize_document_type(data.get("document_type"))
    has_document_number = "document_number" in data
    document_number = _clean_optional_text(data.get("document_number"))
    has_phone = "phone" in data
    phone = _clean_optional_text(data.get("phone"))
    has_birth_date = "birth_date" in data
    birth_date = _clean_optional_text(data.get("birth_date"))
    has_locality = "locality" in data
    locality = _clean_optional_text(data.get("locality"))
    has_province = "province" in data
    province = _clean_optional_text(data.get("province"))
    has_country = "country" in data
    country = _clean_optional_text(data.get("country"))
    has_address = "address" in data
    address = _clean_optional_text(data.get("address"))

    if (
        plan is None
        and role is None
        and full_name is None
        and email is None
        and password is None
        and not has_document_type
        and not has_document_number
        and not has_phone
        and not has_birth_date
        and not has_locality
        and not has_province
        and not has_country
        and not has_address
    ):
        return jsonify({
            "error": (
                "provide at least one field: plan, role, full_name, email, password, "
                "document_type, document_number, phone, birth_date, locality, province, country, address"
            )
        }), 400

    if plan is not None:
        normalized_plan = _normalize_plan(plan)
        plan = normalized_plan

    if role is not None:
        role = _normalize_role(role)

    if full_name is not None:
        full_name = str(full_name).strip()

    if email is not None:
        email = str(email).strip().lower()
        if not email or not _is_valid_email(email):
            return jsonify({"error": "email must be valid"}), 400

    if password is not None:
        password = str(password)
        if len(password) < 6:
            return jsonify({"error": "password must have at least 6 characters"}), 400

    if has_document_type and document_type is None and _clean_optional_text(data.get("document_type")):
        return jsonify({"error": "document_type must be 'DNI' or 'CUIT'"}), 400

    try:
        current_payload = _supabase_admin_request("GET", f"auth/v1/admin/users/{user_id}")
        current_user = _extract_supabase_admin_user(current_payload)
        if not isinstance(current_user, dict):
            return jsonify({"error": "user not found"}), 404

        user_meta = current_user.get("user_metadata") or {}
        if not isinstance(user_meta, dict):
            user_meta = {}
        app_meta = current_user.get("app_metadata") or {}
        if not isinstance(app_meta, dict):
            app_meta = {}

        if plan is not None:
            user_meta["plan"] = plan

        if role is not None:
            if role == "admin":
                app_meta["role"] = "admin"
                app_meta["is_admin"] = True
            else:
                app_meta["role"] = "user"
                app_meta["is_admin"] = False

        if full_name is not None:
            if full_name:
                user_meta["full_name"] = full_name
                user_meta["name"] = full_name
            else:
                user_meta.pop("full_name", None)
                user_meta.pop("name", None)

        if has_document_type:
            if document_type:
                user_meta["document_type"] = document_type
            else:
                user_meta.pop("document_type", None)
        if has_document_number:
            if document_number:
                user_meta["document_number"] = document_number
            else:
                user_meta.pop("document_number", None)
        if has_phone:
            if phone:
                user_meta["phone"] = phone
            else:
                user_meta.pop("phone", None)
        if has_birth_date:
            if birth_date:
                user_meta["birth_date"] = birth_date
            else:
                user_meta.pop("birth_date", None)
        if has_locality:
            if locality:
                user_meta["locality"] = locality
            else:
                user_meta.pop("locality", None)
        if has_province:
            if province:
                user_meta["province"] = province
            else:
                user_meta.pop("province", None)
        if has_country:
            if country:
                user_meta["country"] = country
            else:
                user_meta.pop("country", None)
        if has_address:
            if address:
                user_meta["address"] = address
            else:
                user_meta.pop("address", None)

        update_payload: dict[str, object] = {
            "user_metadata": user_meta,
            "app_metadata": app_meta,
        }
        if email is not None:
            update_payload["email"] = email
        if password is not None:
            update_payload["password"] = password

        updated_payload = _supabase_admin_request(
            "PUT",
            f"auth/v1/admin/users/{user_id}",
            payload=update_payload,
        )
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 500
    except SupabaseAdminError as e:
        return jsonify({"error": e.message}), e.status

    updated_user = _extract_supabase_admin_user(updated_payload)
    if not isinstance(updated_user, dict):
        return jsonify({"error": "unexpected admin response"}), 502

    device_counts = _device_counts_by_owner()
    return jsonify(_serialize_admin_user(updated_user, device_counts))


@api_bp.delete("/admin/users/<user_id>")
def admin_delete_user(user_id: str):
    actor, auth_error = _require_admin()
    if auth_error:
        return auth_error

    if str(actor.get("id")) == str(user_id):
        return jsonify({"error": "you cannot delete your own admin account"}), 400

    try:
        _supabase_admin_request("DELETE", f"auth/v1/admin/users/{user_id}")
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 500
    except SupabaseAdminError as e:
        return jsonify({"error": e.message}), e.status

    with get_con(_db_path()) as con:
        con.execute(
            """
            UPDATE devices
            SET owner_user_id = NULL,
                owner_email = NULL
            WHERE owner_user_id = ?
            """,
            (user_id,),
        )

    return jsonify({"ok": True, "deleted_user_id": user_id})
