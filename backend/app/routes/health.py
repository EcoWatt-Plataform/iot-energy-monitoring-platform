from datetime import datetime
from flask import jsonify, render_template

from . import api_bp, web_bp


@web_bp.get("/")
def home():
    return render_template("index.html")


@web_bp.get("/health")
def health():
    return {"ok": True, "time": datetime.utcnow().isoformat() + "Z"}


@api_bp.get("/health")
def api_health():
    return jsonify({
        "ok": True,
        "service": "api",
        "version": "v1",
        "time": datetime.utcnow().isoformat() + "Z",
    })
