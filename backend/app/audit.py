"""Structured audit log: every mode change, config change, ack and manual
command, with actor + timestamp (backend README Phase 4). In-memory ring
(10k); the Archive seam (archive.py) persists it where configured."""
from collections import deque

LOG: deque = deque(maxlen=10000)

def record(actor: str, action: str, detail: dict | None = None, now_ms: int = 0):
    entry = {"actor": actor, "action": action, "detail": detail or {}, "ts": now_ms}
    LOG.append(entry)
    return entry

def listing(limit: int = 100) -> list[dict]:
    return list(LOG)[-limit:][::-1]

def clear():
    LOG.clear()
