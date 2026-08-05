import sqlite3
import time
import threading
from flask import current_app, jsonify

from ..db import get_con
from . import _db_path, _is_valid_email
from .plan_service import _CHECKOUT_PLAN_RULES, _CHECKOUT_METER_PRICES


# Simple sliding-window rate limiter for the public checkout endpoint.
# Limits each IP to _CHECKOUT_RATE_LIMIT requests per _CHECKOUT_RATE_WINDOW seconds.
_CHECKOUT_RATE_LIMIT = 5
_CHECKOUT_RATE_WINDOW = 60  # seconds
_CHECKOUT_MAX_IPS = 10000   # evict expired entries when dict exceeds this size
_CHECKOUT_IDEMPOTENCY_KEY_MAX_LEN = 120
_CHECKOUT_REQUEST_STATUSES = {"pendiente", "contactado", "cerrado", "descartado"}
_checkout_ip_timestamps: dict[str, list[float]] = {}
_checkout_rate_lock = threading.Lock()


def check_rate_limit(client_ip: str):
    """Returns an error response tuple if rate limited, else None."""
    now = time.time()
    with _checkout_rate_lock:
        timestamps = _checkout_ip_timestamps.get(client_ip, [])
        timestamps = [t for t in timestamps if now - t < _CHECKOUT_RATE_WINDOW]
        if len(timestamps) >= _CHECKOUT_RATE_LIMIT:
            _checkout_ip_timestamps[client_ip] = timestamps
            return jsonify({"error": "too many requests, please try again later"}), 429
        timestamps.append(now)
        _checkout_ip_timestamps[client_ip] = timestamps
        # Evict fully-expired entries to prevent unbounded memory growth.
        if len(_checkout_ip_timestamps) > _CHECKOUT_MAX_IPS:
            expired = [ip for ip, ts in _checkout_ip_timestamps.items()
                       if not any(now - t < _CHECKOUT_RATE_WINDOW for t in ts)]
            for ip in expired:
                del _checkout_ip_timestamps[ip]
    return None


def validate_and_create_checkout(data: dict):
    """Validate checkout data and create the request. Returns (response, status_code)."""
    if not isinstance(data, dict):
        return jsonify({"error": "invalid JSON payload"}), 400

    raw_idempotency_key = data.get("idempotency_key")
    idempotency_key: str | None = None

    if raw_idempotency_key is not None:
        if not isinstance(raw_idempotency_key, str):
            return jsonify({"error": "idempotency_key must be a string"}), 400
        candidate = raw_idempotency_key.strip()
        if candidate:
            if len(candidate) > _CHECKOUT_IDEMPOTENCY_KEY_MAX_LEN:
                return jsonify({
                    "error": f"idempotency_key too long (max {_CHECKOUT_IDEMPOTENCY_KEY_MAX_LEN})"
                }), 400
            idempotency_key = candidate

    raw_plan = str(data.get("plan") or "").strip().lower()
    if raw_plan not in _CHECKOUT_PLAN_RULES:
        return jsonify({"error": "plan must be basico, avanzado or premium"}), 400
    plan = raw_plan
    plan_rule = _CHECKOUT_PLAN_RULES[plan]
    max_meters = int(plan_rule["max_meters"])
    plan_price_ars = int(plan_rule["plan_price_ars"]) * 100  # store as centavos

    meters = data.get("meters") or {}
    if not isinstance(meters, dict):
        return jsonify({"error": "meters must be an object"}), 400

    try:
        plug_qty = int(meters.get("plug", 0))
        panel_1f_qty = int(meters.get("panel_1f", meters.get("panel", 0)))
        panel_3f_qty = int(meters.get("panel_3f", 0))
        extra_phase_qty = int(meters.get("extra_phase", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "meters quantities must be integers"}), 400

    if (
        plug_qty < 0
        or panel_1f_qty < 0
        or panel_3f_qty < 0
        or extra_phase_qty < 0
    ):
        return jsonify({"error": "meters quantities must be >= 0"}), 400

    panel_qty = panel_1f_qty + panel_3f_qty
    total_meters = plug_qty + panel_qty
    if total_meters <= 0:
        return jsonify({"error": "at least one meter is required"}), 400
    if total_meters > max_meters:
        return jsonify({
            "error": f"plan {plan} allows up to {max_meters} meter(s)"
        }), 400
    if extra_phase_qty > 0 and panel_qty <= 0:
        return jsonify({"error": "extra_phase requires at least one panel meter"}), 400

    buyer = data.get("buyer") or {}
    if not isinstance(buyer, dict):
        return jsonify({"error": "buyer must be an object"}), 400

    full_name = str(buyer.get("full_name") or "").strip()
    phone = str(buyer.get("phone") or "").strip()
    email = str(buyer.get("email") or "").strip().lower()
    document_type = str(buyer.get("document_type") or "").strip().lower()
    document_number = str(buyer.get("document_number") or "").strip()
    address = str(buyer.get("address") or "").strip()
    property_type = str(buyer.get("property_type") or "").strip().lower()

    if not full_name:
        return jsonify({"error": "full_name is required"}), 400
    if not phone:
        return jsonify({"error": "phone is required"}), 400
    if not email or not _is_valid_email(email):
        return jsonify({"error": "valid email is required"}), 400
    if document_type not in {"dni", "cuit"}:
        return jsonify({"error": "document_type must be dni or cuit"}), 400
    if not document_number:
        return jsonify({"error": "document_number is required"}), 400
    if not address:
        return jsonify({"error": "address is required"}), 400
    if property_type not in {"casa", "empresa"}:
        return jsonify({"error": "property_type must be casa or empresa"}), 400

    doc_digits = "".join(ch for ch in document_number if ch.isdigit())
    if document_type == "dni" and (len(doc_digits) < 7 or len(doc_digits) > 10):
        return jsonify({"error": "dni must have 7 to 10 digits"}), 400
    if document_type == "cuit" and len(doc_digits) != 11:
        return jsonify({"error": "cuit must have 11 digits"}), 400

    if len(full_name) > 120:
        return jsonify({"error": "full_name too long (max 120)"}), 400
    if len(phone) > 60:
        return jsonify({"error": "phone too long (max 60)"}), 400
    if len(address) > 240:
        return jsonify({"error": "address too long (max 240)"}), 400

    hardware_total_ars = (
        plug_qty * _CHECKOUT_METER_PRICES["plug"]
        + panel_1f_qty * _CHECKOUT_METER_PRICES["panel_1f"]
        + panel_3f_qty * _CHECKOUT_METER_PRICES["panel_3f"]
        + extra_phase_qty * _CHECKOUT_METER_PRICES["extra_phase"]
    ) * 100  # store as centavos
    total_ars = plan_price_ars + hardware_total_ars

    try:
        with get_con(_db_path()) as con:
            cur = con.execute(
                """
                INSERT INTO checkout_requests (
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
                    idempotency_key,
                    buyer_full_name,
                    buyer_phone,
                    buyer_email,
                    buyer_document_type,
                    buyer_document_number,
                    buyer_address,
                    property_type
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
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
                    idempotency_key,
                    full_name,
                    phone,
                    email,
                    document_type,
                    doc_digits,
                    address,
                    property_type,
                ),
            )
            request_id = int(cur.lastrowid or 0)
    except sqlite3.IntegrityError as exc:
        # Unique-key conflicts for idempotency retries should return the original request.
        if not idempotency_key or "idempotency_key" not in str(exc).lower():
            current_app.logger.exception("checkout request insert failed")
            return jsonify({"error": "could not persist checkout request"}), 500

        with get_con(_db_path()) as con:
            row = con.execute(
                """
                SELECT
                    id,
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
                    property_type
                FROM checkout_requests
                WHERE idempotency_key = ?
                LIMIT 1
                """,
                (idempotency_key,),
            ).fetchone()

        if row is None:
            return jsonify({"error": "idempotency key conflict"}), 409

        same_payload = (
            row["plan"] == plan
            and int(row["plan_price_ars"]) == plan_price_ars
            and int(row["max_meters"]) == max_meters
            and int(row["plug_qty"]) == plug_qty
            and int(row["panel_qty"]) == panel_qty
            and int(row["panel_1f_qty"]) == panel_1f_qty
            and int(row["panel_3f_qty"]) == panel_3f_qty
            and int(row["extra_phase_qty"]) == extra_phase_qty
            and int(row["hardware_total_ars"]) == hardware_total_ars
            and int(row["total_ars"]) == total_ars
            and row["buyer_full_name"] == full_name
            and row["buyer_phone"] == phone
            and row["buyer_email"] == email
            and row["buyer_document_type"] == document_type
            and row["buyer_document_number"] == doc_digits
            and row["buyer_address"] == address
            and row["property_type"] == property_type
        )
        if not same_payload:
            return jsonify({"error": "idempotency_key already used with different payload"}), 409

        return jsonify({
            "ok": True,
            "request_id": int(row["id"]),
            "plan": row["plan"],
            "meters_total": int(row["plug_qty"]) + int(row["panel_qty"]),
            "idempotent_replay": True,
        }), 200

    return jsonify({
        "ok": True,
        "request_id": request_id,
        "plan": plan,
        "meters_total": total_meters,
    }), 201
