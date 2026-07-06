import json
from pathlib import Path


CORE_DIR = Path(__file__).resolve().parent
FLAGS_FILE = CORE_DIR / "flags.json"


class FlagValidator:
    """
    Loads flags.json once during startup and keeps it cached.

    This class is read-only after initialization.
    """

    def __init__(self):
        self._flags = self._load_flags()

    def _load_flags(self):
        if not FLAGS_FILE.exists():
            raise FileNotFoundError(
                f"flags.json not found: {FLAGS_FILE}"
            )

        with FLAGS_FILE.open("r", encoding="utf-8") as f:
            data = json.load(f)

        if not isinstance(data, dict):
            raise RuntimeError("flags.json must contain a JSON object.")

        return data

    def task_exists(self, task_id: str) -> bool:
        return task_id in self._flags

    def expected_flag(self, task_id: str):
        return self._flags.get(task_id)

    def validate(self, task_id: str, submitted_flag: str):
        """
        Returns

        (True, None)
            if valid

        (False, reason)
            otherwise
        """

        if task_id not in self._flags:
            return False, "Unknown task."

        if self._flags[task_id] != submitted_flag:
            return False, "Incorrect flag."

        return True, None

    @property
    def flags(self):
        return self._flags.copy()