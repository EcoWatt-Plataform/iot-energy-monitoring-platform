from flask import Blueprint

api_bp = Blueprint("api", __name__, url_prefix="/api/v1")
web_bp = Blueprint("web", __name__)

# Import route modules to register their @bp decorators.
# These imports MUST come after blueprint creation above.
from . import health, checkout, admin, devices, ingest, metrics, export  # noqa: E402, F401
