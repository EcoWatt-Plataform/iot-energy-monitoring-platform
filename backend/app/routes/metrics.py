from flask import jsonify, request

from . import api_bp
from ..services.auth_service import _require_user
from ..services.plan_service import (
    _resolve_owner_user_id,
    _resolve_owner_plan,
    _enforce_month_history_limit,
    _enforce_date_history_limit,
)
from ..services.metrics_service import get_summary_month, get_daily_metrics


@api_bp.get("/metrics/summary_month")
def summary_month():
    """
    Query:
      - month=YYYY-MM  (obligatorio)
      - device_id=1    (opcional)

    Devuelve totales del mes + stats por dispositivo.
    Si se pasa device_id, filtra solo ese dispositivo.
    """
    user, auth_error = _require_user()
    if auth_error:
        return auth_error

    owner_user_id, owner_error = _resolve_owner_user_id(user)
    if owner_error:
        return owner_error

    month = (request.args.get("month") or "").strip()
    if not month or len(month) != 7:
        return jsonify({"error": "month must be YYYY-MM"}), 400

    owner_plan, owner_plan_error = _resolve_owner_plan(user, owner_user_id)
    if owner_plan_error:
        return owner_plan_error

    history_error = _enforce_month_history_limit(owner_plan, month)
    if history_error:
        return history_error

    device_id = request.args.get("device_id", type=int)

    result = get_summary_month(owner_user_id, month, device_id)
    return jsonify(result)


@api_bp.get("/metrics/daily")
def metrics_daily():
    """
    Query:
      - device_id (int) obligatorio
      - from=YYYY-MM-DD obligatorio
      - to=YYYY-MM-DD obligatorio

    Devuelve consumo diario agrupado por día (YYYY-MM-DD).
    """
    user, auth_error = _require_user()
    if auth_error:
        return auth_error

    owner_user_id, owner_error = _resolve_owner_user_id(user)
    if owner_error:
        return owner_error

    device_id = request.args.get("device_id", type=int)
    date_from = (request.args.get("from") or "").strip()
    date_to = (request.args.get("to") or "").strip()

    if not device_id:
        return jsonify({"error": "device_id is required"}), 400
    if not date_from or len(date_from) != 10:
        return jsonify({"error": "from must be YYYY-MM-DD"}), 400
    if not date_to or len(date_to) != 10:
        return jsonify({"error": "to must be YYYY-MM-DD"}), 400

    owner_plan, owner_plan_error = _resolve_owner_plan(user, owner_user_id)
    if owner_plan_error:
        return owner_plan_error

    history_error = _enforce_date_history_limit(owner_plan, date_from, date_to)
    if history_error:
        return history_error

    result = get_daily_metrics(device_id, owner_user_id, date_from, date_to)
    if result is None:
        return jsonify({"error": "device not found"}), 404

    return jsonify(result)
