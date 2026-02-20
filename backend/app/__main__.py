import os

from . import create_app

app = create_app()

if __name__ == "__main__":
    # Dev server
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "").strip().lower() in ("1", "true", "yes")
    app.run(host=host, port=port, debug=debug)
