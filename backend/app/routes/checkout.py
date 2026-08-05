from flask import request

from . import api_bp
from ..services.checkout_service import check_rate_limit, validate_and_create_checkout


@api_bp.post("/checkout/request")
def create_checkout_request():
    client_ip = (request.headers.get("X-Real-IP") or request.remote_addr or "").strip() or "unknown"

    rate_error = check_rate_limit(client_ip)
    if rate_error:
        return rate_error

    data = request.get_json(silent=True) or {}
    return validate_and_create_checkout(data)
