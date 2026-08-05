from flask import jsonify, request, Response

from . import api_bp
from ..services.auth_service import _require_user
from ..services.plan_service import _resolve_owner_user_id, _plan_from_user
from ..services.export_service import (
    export_measurements_csv,
    export_daily_csv,
    export_alerts_csv,
)


def _require_premium_export(user, owner_user_id):
    """Common checks for CSV export endpoints. Returns error response or None."""
    if owner_user_id != user["id"]:
        return jsonify({"error": "CSV export is not allowed when impersonating another user"}), 403

    if _plan_from_user(user) != "premium":
        return jsonify({"error": "CSV export requires a Premium plan"}), 403

    return None


@api_bp.get("/export/measurements.csv")
def export_measurements_csv_route():
    """
    GET /api/v1/export/measurements.csv?month=YYYY-MM&device_id=1

    - month (YYYY-MM) requerido
    - device_id opcional (si no, exporta todos)
    """
    user, auth_error = _require_user()
    if auth_error:
        return auth_error

    owner_user_id, owner_error = _resolve_owner_user_id(user)
    if owner_error:
        return owner_error

    premium_error = _require_premium_export(user, owner_user_id)
    if premium_error:
        return premium_error

    month = (request.args.get("month") or "").strip()
    device_id = request.args.get("device_id", type=int)

    csv_data, filename, error = export_measurements_csv(owner_user_id, month, device_id)
    if error:
        return jsonify({"error": error[0]}), error[1]

    resp = Response(csv_data, mimetype="text/csv; charset=utf-8")
    resp.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    return resp


@api_bp.get("/export/daily.csv")
def export_daily_csv_route():
    """
    GET /api/v1/export/daily.csv?month=YYYY-MM&device_id=1
    """
    user, auth_error = _require_user()
    if auth_error:
        return auth_error

    owner_user_id, owner_error = _resolve_owner_user_id(user)
    if owner_error:
        return owner_error

    premium_error = _require_premium_export(user, owner_user_id)
    if premium_error:
        return premium_error

    month = (request.args.get("month") or "").strip()
    device_id = request.args.get("device_id", type=int)

    csv_data, filename, error = export_daily_csv(owner_user_id, month, device_id)
    if error:
        return jsonify({"error": error[0]}), error[1]

    resp = Response(csv_data, mimetype="text/csv; charset=utf-8")
    resp.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    return resp


@api_bp.get("/export/alerts.csv")
def export_alerts_csv_route():
    """
    GET /api/v1/export/alerts.csv?month=YYYY-MM&device_id=1
    Exporta alertas del mes: dispositivos cuyo consumo mensual supera monthly_threshold_wh.
    """
    user, auth_error = _require_user()
    if auth_error:
        return auth_error

    owner_user_id, owner_error = _resolve_owner_user_id(user)
    if owner_error:
        return owner_error

    premium_error = _require_premium_export(user, owner_user_id)
    if premium_error:
        return premium_error

    month = (request.args.get("month") or "").strip()
    device_id = request.args.get("device_id", type=int)

    csv_data, filename, error = export_alerts_csv(owner_user_id, month, device_id)
    if error:
        return jsonify({"error": error[0]}), error[1]

    resp = Response(csv_data, mimetype="text/csv; charset=utf-8")
    resp.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    return resp
