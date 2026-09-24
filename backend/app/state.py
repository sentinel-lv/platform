"""In-memory feeder state, ring buffers, node registry (backend README Phase 3).

Ring: 30 min @ 2 Hz = 3600 samples/node max; history endpoints slice windows.
OFFLINE if no telemetry for > 30 s. seq wrap (reboot -> 0) handled, not a replay.
"""
from collections import deque, defaultdict
from .arbiter import NodeState

OFFLINE_AFTER_MS = 30_000
RING_MAX = 3600  # 30 min @ 2 Hz

class FeederState:
    def __init__(self, feeder_id: str):
        self.feeder_id = feeder_id
        self.ring: dict[str, deque] = defaultdict(lambda: deque(maxlen=RING_MAX))
        self.latest: dict[str, dict] = {}      # node_id -> last telemetry
        self.last_seen: dict[str, int] = {}    # node_id -> ts
        self.suspect_since: dict[str, int] = {}  # node_id -> first SUSPECT ts (for latency)
        self.ordered_ids: list[str] = []

    def set_order(self, order: list[str]):
        """Impose canonical feeder order (commissioning path)."""
        extras = [nid for nid in self.ordered_ids if nid not in order]
        self.ordered_ids = [nid for nid in order if nid] + extras

    def update(self, tel: dict) -> tuple[bool, str | None, str | None]:
        """Store sample. Returns (transitioned, node_id, prev_state)."""
        nid = tel["node_id"]
        prev = self.latest.get(nid, {}).get("state")
        self.latest[nid] = tel
        self.last_seen[nid] = tel["ts"]
        self.ring[nid].append(tel)
        if nid not in self.ordered_ids:
            self.ordered_ids.append(nid)  # self-registration appends at tail
        if tel["state"] in ("SUSPECT", "CONFIRMED") and nid not in self.suspect_since:
            self.suspect_since[nid] = tel["ts"]
        if tel["state"] == "NORMAL" and prev in ("SUSPECT", "CONFIRMED", "RECOVERED"):
            self.suspect_since.pop(nid, None)
        return (prev != tel["state"], nid if prev != tel["state"] else None, prev)

    def offline_ids(self, now_ms: int) -> list[str]:
        return [nid for nid, ts in self.last_seen.items() if now_ms - ts > OFFLINE_AFTER_MS]

    def snapshot(self, now_ms: int) -> list[NodeState]:
        """Ordered upstream→downstream NodeStates for decide()."""
        out = []
        off = set(self.offline_ids(now_ms))
        ids = [nid for nid in self.ordered_ids if nid in self.latest]
        ids += [nid for nid in self.latest if nid not in self.ordered_ids]
        for nid in ids:
            tel = self.latest[nid]
            st = "OFFLINE" if nid in off else tel["state"]
            ts = self.suspect_since.get(nid, tel["ts"])
            out.append(NodeState(nid, st, tel.get("deviation_pct", 0.0), ts))
        return out

    def history(self, node_id: str, window: int = 300) -> list[dict]:
        return list(self.ring.get(node_id, []))[-window:]
