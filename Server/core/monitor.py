from dataclasses import dataclass
from datetime import datetime
from queue import Queue
from sys import platform as sys_platform
from threading import Event, Lock, Thread
from time import sleep
from typing import Dict, List, Tuple

from arrow import now
import requests
from rich.console import Console
from rich.live import Live
from rich.panel import Panel
from rich.table import Table

from pathlib import Path
from threading import Thread

import winsound

ONLINE_TIMEOUT = 30
# Panel title, borders, table header, subtitle, and a small safety margin.
LAYOUT_OVERHEAD = 8

CORE_DIR = Path(__file__).resolve().parent
JOIN_SOUND = CORE_DIR / "music" / "join.wav"


def play_join_sound():
    """
    Play the player-join notification asynchronously.
    """

    if not JOIN_SOUND.exists():
        return

    try:
        winsound.PlaySound(
            str(JOIN_SOUND),
            winsound.SND_FILENAME | winsound.SND_ASYNC,
        )
    except Exception:
        pass

class LocationResolver:
    """
    Resolves IP locations asynchronously.

    Each (username, ip) pair is looked up only once and cached
    in memory.
    """

    LOOKUP_URL = "http://ip-api.com/json/{ip}?fields=status,country,regionName,region,city"

    def __init__(self):
        self._cache: Dict[Tuple[str, str], str] = {}
        self._pending: set[Tuple[str, str]] = set()

        self._lock = Lock()
        self._queue: Queue[Tuple[str, str]] = Queue()

        Thread(
            target=self._worker,
            daemon=True,
        ).start()

    def get(self, username: str, ip: str) -> str:

        key = (username, ip)

        with self._lock:

            if key in self._cache:
                return self._cache[key]

            if key not in self._pending:
                self._pending.add(key)
                self._cache[key] = "Resolving..."
                self._queue.put(key)

            return self._cache[key]

    def _worker(self):

        while True:

            username, ip = self._queue.get()

            location = self._lookup(ip)

            key = (username, ip)

            with self._lock:
                self._cache[key] = location
                self._pending.discard(key)

            self._queue.task_done()

    def _lookup(self, ip: str) -> str:

        try:

            response = requests.get(
                self.LOOKUP_URL.format(ip=ip),
                timeout=5,
            )

            data = response.json()

            if data.get("status") != "success":
                return "Unknown"

            parts = []

            city = data.get("city")
            region = data.get("regionName") or data.get("region")
            country = data.get("country")

            if city:
                parts.append(city)

            if region:
                parts.append(region)

            if country:
                parts.append(country)

            if parts:
                return ", ".join(parts)

        except Exception:
            pass

        return "Unknown"


location_resolver = LocationResolver()


@dataclass
class PlayerInfo:
    ip: str
    username: str
    points: int = 0

    first_seen: datetime | None = None
    last_seen: datetime | None = None

    requests: int = 0

    @property
    def online(self) -> bool:
        if self.requests == 0 or self.last_seen is None:
            return False

        return (
            datetime.now() - self.last_seen
        ).total_seconds() <= ONLINE_TIMEOUT


class PlayerRegistry:

    def __init__(self):

        self.players: Dict[Tuple[str, str], PlayerInfo] = {}

        self.lock = Lock()

        self.changed = Event()

    def restore_player(
        self,
        ip: str,
        username: str,
        points: int,
    ):

        key = (username, ip)

        with self.lock:

            if key in self.players:
                return

            self.players[key] = PlayerInfo(
                ip=ip,
                username=username,
                points=points,
                first_seen=None,
                last_seen=None,
                requests=0,
            )

        self.changed.set()

    def update(
        self,
        ip: str,
        username: str,
        points: int,
    ) -> bool:

        now = datetime.now()

        key = (username, ip)

        persistent_changed = False

        with self.lock:

            # if key not in self.players:

            #     self.players[key] = PlayerInfo(
            #         ip=ip,
            #         username=username,
            #         points=points,
            #         first_seen=now,
            #         last_seen=now,
            #         requests=1,
            #     )

            #     persistent_changed = True

            if key not in self.players:

                self.players[key] = PlayerInfo(
                    ip=ip,
                    username=username,
                    points=points,
                    first_seen=now,
                    last_seen=now,
                    requests=1,
                )

                play_join_sound()

                persistent_changed = True

            else:

                player = self.players[key]

                if player.requests == 0:
                    player.first_seen = now

                player.last_seen = now
                player.requests += 1

                if player.points != points:
                    player.points = points
                    persistent_changed = True

        self.changed.set()

        return persistent_changed

    def export_persistent(self):

        with self.lock:

            return [
                {
                    "ip": player.ip,
                    "username": player.username,
                    "points": player.points,
                }
                for player in self.players.values()
            ]

    # def snapshot(self):

    #     now = datetime.now()

    #     with self.lock:

    #         rows = []

    #         for player in self.players.values():

    #             if player.requests == 0:

    #                 since = None
    #                 online = False

    #             else:

    #                 since = (
    #                     now -
    #                     player.last_seen
    #                 ).total_seconds()

    #                 online = since <= ONLINE_TIMEOUT

    #             rows.append({

    #                 "ip": player.ip,
    #                 "username": player.username,
    #                 "location": location_resolver.get(
    #                     player.username,
    #                     player.ip,
    #                 ),
    #                 "points": player.points,

    #                 "requests": player.requests,

    #                 "first_seen": player.first_seen,
    #                 "last_seen": player.last_seen,

    #                 # "since": since,

    #                 "online": online,

    #             })

    #     rows.sort(
    #         key=lambda p: -p["points"]
    #     )

    #     return rows

    def snapshot(self):

        now = datetime.now()

        with self.lock:

            rows = []

            for player in self.players.values():

                if player.requests == 0:
                    online = False
                else:
                    online = (
                        now - player.last_seen
                    ).total_seconds() <= ONLINE_TIMEOUT

                rows.append({

                    "ip": player.ip,
                    "username": player.username,

                    "location": location_resolver.get(
                        player.username,
                        player.ip,
                    ),

                    "points": player.points,

                    "requests": player.requests,

                    "first_seen": player.first_seen,
                    "last_seen": player.last_seen,

                    "online": online,

                })

        rows.sort(
            key=lambda p: -p["points"]
        )

        return rows


class Monitor:

    def __init__(self, registry: PlayerRegistry):
        self.registry = registry
        self.console = Console()
        self.current_page = 0
        self._total_pages = 1
        self._page_lock = Lock()
        self._last_console_size = self.console.size

        # Add this
        self._last_online_states = {}

    def _prev_page(self) -> None:
        with self._page_lock:
            if self.current_page <= 0:
                return
            self.current_page -= 1
        self.registry.changed.set()

    def _next_page(self) -> None:
        with self._page_lock:
            if self.current_page >= self._total_pages - 1:
                return
            self.current_page += 1
        self.registry.changed.set()

    def _keyboard_worker(self) -> None:
        if sys_platform == "win32":
            self._keyboard_worker_windows()
        else:
            self._keyboard_worker_unix()

    def _keyboard_worker_windows(self) -> None:
        import msvcrt

        while True:
            if msvcrt.kbhit():
                key = msvcrt.getch()
                if key in (b"\x00", b"\xe0"):
                    key = msvcrt.getch()
                    if key == b"K":
                        self._prev_page()
                    elif key == b"M":
                        self._next_page()
            sleep(0.05)

    def _keyboard_worker_unix(self) -> None:
        import select
        import sys
        import termios
        import tty

        if not sys.stdin.isatty():
            return

        fd = sys.stdin.fileno()
        old_settings = termios.tcgetattr(fd)

        try:
            tty.setcbreak(fd)

            while True:
                ready, _, _ = select.select([sys.stdin], [], [], 0.05)
                if not ready:
                    continue

                ch = sys.stdin.read(1)
                if ch != "\x1b":
                    continue

                sequence = ""
                while select.select([sys.stdin], [], [], 0)[0]:
                    sequence += sys.stdin.read(1)

                if sequence == "[D":
                    self._prev_page()
                elif sequence == "[C":
                    self._next_page()

        finally:
            termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)

    def _rows_per_page(self) -> int:
        return max(1, self.console.size.height - LAYOUT_OVERHEAD)

    def _handle_resize(self, snapshot: List[dict]) -> None:
        size = self.console.size

        if size == self._last_console_size:
            return

        self._last_console_size = size

        rows_per_page = self._rows_per_page()
        total_pages = max(
            1,
            (len(snapshot) + rows_per_page - 1) // rows_per_page,
        )

        with self._page_lock:
            self.current_page = min(self.current_page, total_pages - 1)
            self._total_pages = total_pages

    def _make_table(self, rows: List[dict]) -> Table:
        table = Table(
            title=" ",
            expand=True,
            show_lines=False,
        )

        table.add_column(
            "IP Address",
            style="cyan",
            no_wrap=True,
        )

        table.add_column(
            "Username",
            style="magenta",
        )

        table.add_column(
            "Location",
        )

        table.add_column(
            "Status",
            justify="center",
        )

        table.add_column(
            "Points",
            justify="right",
            style="yellow",
        )

        table.add_column(
            "First Seen",
        )

        table.add_column(
            "Last Seen",
        )

        # table.add_column(
        #     "Since Last Seen",
        #     justify="right",
        #     style="yellow",
        # )

        table.add_column(
            "Requests",
            justify="right",
            style="green",
        )

        for player in rows:
            if player["online"]:
                status = "[bold green]● ONLINE[/]"
            else:
                status = "[bold red]● OFFLINE[/]"

            first_seen = (
                "-"
                if player["first_seen"] is None
                else player["first_seen"].strftime("%Y-%m-%d %H:%M:%S")
            )

            last_seen = (
                "-"
                if player["last_seen"] is None
                else player["last_seen"].strftime("%Y-%m-%d %H:%M:%S")
            )

            # since = (
            #     "-"
            #     if player["since"] is None
            #     else f"{player['since']:.1f}s"
            # )

            # table.add_row(
            #     player["ip"],
            #     player["username"],
            #     player["location"],
            #     status,
            #     str(player["points"]),
            #     first_seen,
            #     last_seen,
            #     since,
            #     str(player["requests"]),
            # )

            table.add_row(
                player["ip"],
                player["username"],
                player["location"],
                status,
                str(player["points"]),
                first_seen,
                last_seen,
                str(player["requests"]),
            )

        return table

    def build_table(self):

        snapshot = self.registry.snapshot()

        self._handle_resize(snapshot)

        rows_per_page = self._rows_per_page()
        total_pages = max(
            1,
            (len(snapshot) + rows_per_page - 1) // rows_per_page,
        )

        with self._page_lock:
            self._total_pages = total_pages
            self.current_page = min(self.current_page, total_pages - 1)
            current_page = self.current_page

        start = current_page * rows_per_page
        page_rows = snapshot[start:start + rows_per_page]

        online = sum(1 for player in snapshot if player["online"])
        offline = len(snapshot) - online

        subtitle = (
            f"[green]Online:[/] {online}    "
            f"[red]Offline:[/] {offline}    "
            f"[cyan]Total:[/] {len(snapshot)}"
        )

        if total_pages > 1:
            subtitle += (
                f"    [white]Page {current_page + 1}/{total_pages}[/]"
                f"    [dim](← → to navigate)[/]"
            )

        return Panel(
            self._make_table(page_rows),
            title="[bold cyan]PLAYER MONITOR[/bold cyan]",
            subtitle=subtitle,
            border_style="cyan",
        )

    def run(self):

        Thread(
            target=self._keyboard_worker,
            daemon=True,
        ).start()

        # with Live(
        #     self.build_table(),
        #     console=self.console,
        #     screen=True,
        #     refresh_per_second=1,
        #     transient=False,
        # ) as live:

        with Live(
            self.build_table(),
            console=self.console,
            screen=True,
            auto_refresh=False,
            transient=False,
        ) as live:

            # while True:

            #     self.registry.changed.wait(timeout=1)
            #     self.registry.changed.clear()

            #     live.update(
            #         self.build_table(),
            #         refresh=True,
            #     )

            while True:
                changed = self.registry.changed.wait(timeout=1)

                # Timeout occurred; refresh only if an ONLINE/OFFLINE state changed.
                if not changed:
                    snapshot = self.registry.snapshot()

                    online_states = {
                        (p["username"], p["ip"]): p["online"]
                        for p in snapshot
                    }

                    if online_states == self._last_online_states:
                        continue

                    self._last_online_states = online_states
                else:
                    self.registry.changed.clear()

                live.update(
                    self.build_table(),
                    refresh=True,
                )