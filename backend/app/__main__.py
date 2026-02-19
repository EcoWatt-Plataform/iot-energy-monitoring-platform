import os

from . import create_app

app = create_app()

if __name__ == "__main__":
    # Dev server
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "1") != "0"
    app.run(host=host, port=port, debug=debug)
