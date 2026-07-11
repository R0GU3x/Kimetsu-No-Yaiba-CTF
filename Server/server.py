from threading import Thread

from flask import Flask, jsonify, request
from flask_cors import CORS

from core.monitor import Monitor, PlayerRegistry
from core.storage import PlayerStorage

import logging
from flask.cli import show_server_banner

show_server_banner = lambda *args: None

logging.getLogger("werkzeug").disabled = True

app = Flask(__name__)
CORS(app)

registry = PlayerRegistry()
storage = PlayerStorage()


# ---------------------------------------------------------
# Restore persisted players
# ---------------------------------------------------------

for player in storage.load():

    registry.restore_player(
        ip=player["ip"],
        username=player["username"],
        points=player.get("points", 0),
    )


# ---------------------------------------------------------
# Background monitor
# ---------------------------------------------------------

def monitor_worker():
    Monitor(registry).run()


# ---------------------------------------------------------
# Routes
# ---------------------------------------------------------

@app.get("/")
def index():

    return jsonify(
        service="Player Heartbeat Monitor",
        status="running",
    )


@app.post("/api/player")
def player():

    data = request.get_json(silent=True)

    if data is None:

        return jsonify(
            success=False,
            error="Missing JSON body.",
        ), 400

    required = (
        "ip",
        "username",
        "points",
    )

    for field in required:

        if field not in data:

            return jsonify(
                success=False,
                error=f"Missing field '{field}'.",
            ), 400

    ip = str(data["ip"]).strip()
    username = str(data["username"]).strip()

    if not ip:
        return jsonify(
            success=False,
            error="IP cannot be empty.",
        ), 400

    if not username:
        return jsonify(
            success=False,
            error="Username cannot be empty.",
        ), 400

    try:
        points = int(data["points"])
    except (TypeError, ValueError):

        return jsonify(
            success=False,
            error="'points' must be an integer.",
        ), 400

    persistent_changed = registry.update(
        ip=ip,
        username=username,
        points=points,
    )

    if persistent_changed:
        storage.save(registry)

    return "", 204


# ---------------------------------------------------------
# Main
# ---------------------------------------------------------

if __name__ == "__main__":

    Thread(
        target=monitor_worker,
        daemon=True,
    ).start()

    app.run(
        host="0.0.0.0",
        port=5000,
        threaded=True,
        use_reloader=False,
    )