from flask import jsonify, request

from . import api_bp
from ..services.auth_service import _require_user
from ..services.plan_service import _resolve_owner_user_id, _resolve_owner_plan
from ..services.device_service import create_device, list_devices, update_device, delete_device


@api_bp.post("/devices")
def create_device_route():
    """
    Crea un dispositivo.
    Body JSON: { "name": "Casa", "monthly_threshold_wh": 25000 }
    Respuesta: { id, name, api_key, monthly_threshold_wh }
    """
    user, auth_error = _require_user()
    if auth_error:
        return auth_error

    owner_user_id, owner_error = _resolve_owner_user_id(user)
    if owner_error:
        return owner_error

    owner_plan, owner_plan_error = _resolve_owner_plan(user, owner_user_id)
    if owner_plan_error:
        return owner_plan_error

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()

    try:
        threshold = float(data.get("monthly_threshold_wh") or 0)
    except (TypeError, ValueError):
        return jsonify({"error": "monthly_threshold_wh must be a number"}), 400

    if not name:
        return jsonify({"error": "name is required"}), 400
    if len(name) > 80:
        return jsonify({"error": "name too long (max 80)"}), 400
    if threshold < 0:
        return jsonify({"error": "monthly_threshold_wh must be >= 0"}), 400

    owner_email = (user.get("email") or "").strip() or None
    if owner_user_id != str(user.get("id") or ""):
        owner_email = None

    return create_device(owner_user_id, owner_email, name, threshold, owner_plan)


@api_bp.get("/devices")
def list_devices_route():
    user, auth_error = _require_user()
    if auth_error:
        return auth_error

    owner_user_id, owner_error = _resolve_owner_user_id(user)
    if owner_error:
        return owner_error

    return list_devices(owner_user_id)


@api_bp.patch("/devices/<int:device_id>")
def update_device_route(device_id: int):
    user, auth_error = _require_user()
    if auth_error:
        return auth_error

    owner_user_id, owner_error = _resolve_owner_user_id(user)
    if owner_error:
        return owner_error

    data = request.get_json(silent=True) or {}
    return update_device(device_id, owner_user_id, data)


@api_bp.delete("/devices/<int:device_id>")
def delete_device_route(device_id: int):
    """
    Elimina un dispositivo y sus mediciones.
    """
    user, auth_error = _require_user()
    if auth_error:
        return auth_error

    owner_user_id, owner_error = _resolve_owner_user_id(user)
    if owner_error:
        return owner_error

    return delete_device(device_id, owner_user_id)
