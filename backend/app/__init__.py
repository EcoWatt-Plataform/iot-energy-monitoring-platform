import os
from flask import Flask
from flask_cors import CORS

from .config import Settings
from .db import init_db
from .routes import api_bp, web_bp

def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)

    settings = Settings.load()
    app.config["SETTINGS"] = settings

    schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
    init_db(settings.db_path, schema_path)

    app.register_blueprint(api_bp)
    app.register_blueprint(web_bp)

    return app