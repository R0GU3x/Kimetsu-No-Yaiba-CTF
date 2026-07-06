import json
import os
import tempfile
from pathlib import Path
from threading import Lock


CORE_DIR = Path(__file__).resolve().parent
PLAYERS_FILE = CORE_DIR / "players.json"


class PlayerStorage:
    """
    Handles persistent player storage.

    Persisted fields:
        - ip
        - username
        - points

    Runtime fields (heartbeat timestamps, requests, online status)
    are intentionally not stored.
    """

    def __init__(self):
        self._lock = Lock()

    def load(self):
        """
        Load players.json.

        Returns:
            list[dict]
        """

        if not PLAYERS_FILE.exists():
            return []

        try:
            with PLAYERS_FILE.open("r", encoding="utf-8") as f:
                data = json.load(f)

            if isinstance(data, list):
                return data

        except Exception:
            pass

        return []

    def save(self, registry):
        """
        Atomically write players.json.
        """

        players = registry.export_persistent()

        PLAYERS_FILE.parent.mkdir(parents=True, exist_ok=True)

        with self._lock:

            fd, temp_path = tempfile.mkstemp(
                prefix="players_",
                suffix=".json",
                dir=PLAYERS_FILE.parent,
            )

            try:

                with os.fdopen(fd, "w", encoding="utf-8") as f:

                    json.dump(
                        players,
                        f,
                        indent=4,
                        ensure_ascii=False,
                    )

                    f.flush()
                    os.fsync(f.fileno())

                os.replace(temp_path, PLAYERS_FILE)

            finally:

                if os.path.exists(temp_path):
                    os.remove(temp_path)