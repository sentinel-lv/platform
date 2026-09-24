"""Telemetry/event archive seam (backend README Phase 4).

Default: FileArchive — daily JSONL (telemetry + events), retention-pruned,
and directly replayable by the simulator replay mode (simulator/README: Later).
Production: TimescaleArchive — same two methods, hypertable on ts; schema in
docs/timescale.sql (90-day retention policy included).
"""
import datetime
import json
import pathlib

class FileArchive:
    def __init__(self, root="var/archive", retention_days=90):
        self.root = pathlib.Path(root)
        self.root.mkdir(parents=True, exist_ok=True)
        self.retention_days = retention_days

    def _day_file(self, kind: str, day: str):
        return self.root / f"{kind}-{day}.jsonl"

    def append(self, kind: str, obj: dict, day: str | None = None):
        day = day or datetime.date.today().isoformat()
        with open(self._day_file(kind, day), "a") as f:
            f.write(json.dumps(obj) + "\n")

    def read_day(self, kind: str, day: str) -> list[dict]:
        fp = self._day_file(kind, day)
        if not fp.exists():
            return []
        return [json.loads(line) for line in fp.read_text().splitlines() if line.strip()]

    def prune(self, today: str | None = None):
        today_d = datetime.date.fromisoformat(today) if today else datetime.date.today()
        for fp in self.root.glob("*.jsonl"):
            try:
                day = datetime.date.fromisoformat(fp.stem.split("-", 1)[1])
            except (ValueError, IndexError):
                continue
            if (today_d - day).days > self.retention_days:
                fp.unlink()
