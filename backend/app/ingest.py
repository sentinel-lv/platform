"""Telemetry intake; swappable simulator <-> MQTT (backend README §3).

Event-driven arbiter: invoked on every state TRANSITION, never on a poll loop
(poll interval would corrupt latency_ms). Consumes simulator Bus in demo,
MQTT client in production — same push interface.
"""
import asyncio
from .arbiter import decide
from . import config as cfg
from .geo import geo

_archive_inst = None

def _archive():
    global _archive_inst
    import os
    root = os.getenv("ARCHIVE_DIR", "")
    if not root:
        return None
    if _archive_inst is None or str(_archive_inst.root) != root:
        from .archive import FileArchive
        _archive_inst = FileArchive(root=root)
    return _archive_inst
from .state import FeederState
from .events import build_event
from .ws import hub

states: dict[str, FeederState] = {}
event_log: list[dict] = []
_last_key: dict[str, tuple | None] = {}  # feeder -> last emitted (action, span, reason)
_saw_suspect: dict[str, bool] = {}  # feeder -> asserted nodes seen without any firing (vetoed episodes)
_isolated_episode: dict[str, bool] = {}  # feeder -> a true ISOLATE fired since last clear
_pending: dict[str, tuple] = {}  # feeder -> (key, consecutive_count) for ISOLATE-grade debounce
DEBOUNCE_N = 3  # same span verdict on N consecutive evaluations before emitting

def get_state(feeder_id: str) -> FeederState:
    return states.setdefault(feeder_id, FeederState(feeder_id))

async def handle_telemetry(tel: dict):
    st = get_state(tel["feeder_id"])
    transitioned, _, prev = st.update(tel)
    if tel["node_id"] in geo.order() and st.ordered_ids != geo.order():
        st.set_order(geo.order())  # commissioned order wins over arrival order
    await hub.broadcast("telemetry", tel)
    arch = _archive()
    if arch is not None:
        arch.append("telemetry", tel)
    if transitioned:
        # A node back from OFFLINE is a recovery, not a rejected suspicion.
        await _evaluate(st, tel["feeder_id"], tel["ts"], suppress_rejection=(prev == "OFFLINE"))


async def reap_once(now_ms: int):
    """Offline reaper (run every ~5 s from lifespan): a node silent > 30 s gets
    an OFFLINE verdict through the same decide() path. Without this, a dead
    node would never raise its ALERT — silence fires no transition."""
    for fid, st in states.items():
        for nid in st.offline_ids(now_ms):
            if st.latest.get(nid, {}).get("state") == "OFFLINE":
                continue  # already raised
            st.latest[nid]["state"] = "OFFLINE"
            await _evaluate(st, fid, now_ms, suppress_rejection=False)


async def _evaluate(st, feeder_id: str, now: int, suppress_rejection: bool):
    if True:
        snap = st.snapshot(now)
        if any(n.state in ("SUSPECT", "CONFIRMED") for n in snap):
            _saw_suspect[feeder_id] = True  # asserted, even if vetoed below
        decision = decide(snap, now, cfg.get_config(feeder_id))
        key = (decision.action, decision.fault_span, decision.reason)
        if decision.action == "NONE":
            last = _last_key.get(feeder_id)

            # A veto is an ACTIVE refusal, not the absence of a fault: the
            # arbiter saw a collapse and declined to trip. It used to emit
            # nothing at all, which made substation_outage look like a dead
            # button — every node went SUSPECT on the map and the timeline
            # only showed the misleading single_node_no_quorum rows from the
            # ramp-up. Surface it, deduped so a held outage is one row.
            if decision.reason != "no_fault":
                if key == last:
                    return
                _last_key[feeder_id] = key
                trail = [{"ts": n.ts, "node": n.node_id, "state": n.state}
                         for n in snap if n.state in ("SUSPECT", "CONFIRMED")]
                ev = build_event(feeder_id, decision, trail, now)
                event_log.append(ev)
                await hub.broadcast("event", ev)
                if _archive() is not None:
                    _archive().append("event", ev)
                return

            # rejection line = we suspected (ALERT or vetoed SUSPECT wave) but never
            # isolated, and the field is back. After a true ISOLATE, or when a node
            # simply returns from OFFLINE, clear silently.
            if not suppress_rejection and not _isolated_episode.get(feeder_id) and (
                    (last is not None and last[0] != "ISOLATE") or _saw_suspect.get(feeder_id)):
                ev = build_event(feeder_id, decision,
                                 [{"ts": now, "node": "GW", "state": "RECOVERED"}], now)
                event_log.append(ev)
                await hub.broadcast("event", ev)
            _last_key[feeder_id] = None
            _saw_suspect[feeder_id] = False
            _isolated_episode[feeder_id] = False
            return
        if key == _last_key.get(feeder_id):
            return  # same verdict re-asserted by the next voter: no duplicate event
        if decision.action == "ISOLATE":
            # Debounce: a recovery frontier (or staggered assert) sweeps a different
            # span past on every sample; only a physically stable fault repeats the
            # same span. ALERT-grade verdicts still emit immediately.
            pk, n = _pending.get(feeder_id, (None, 0))
            n = n + 1 if pk == key else 1
            _pending[feeder_id] = (key, n)
            if n < DEBOUNCE_N:
                return
            _pending[feeder_id] = (None, 0)
        _last_key[feeder_id] = key
        if True:  # emit firing event below
            trail = [{"ts": n.ts, "node": n.node_id, "state": n.state}
                     for n in st.snapshot(now) if n.state in ("SUSPECT", "CONFIRMED")]
            ev = build_event(feeder_id, decision, trail, now)
            event_log.append(ev)
            await hub.broadcast("event", ev)
            if _archive() is not None:
                _archive().append("event", ev)
            if ev["isolated"]:
                await hub.broadcast("command", {
                    "feeder_id": feeder_id, "action": "ISOLATE",
                    "reason": "quorum_confirmed", "fault_span": ev["fault_span"],
                    "ts": now, "latency_ms": ev["latency_ms"],
                    "issued_by": "GW-TVM-01", "mode": cfg.get_mode(feeder_id)})
            _isolated_episode[feeder_id] = _isolated_episode.get(feeder_id, False) or ev["isolated"]
            # latch downstream CONFIRMED so the shadow agrees with the gateway
            if ev["isolated"]:
                for nid in st.ordered_ids[st.ordered_ids.index(ev["fault_span"][1]):]:
                    if nid in st.latest and st.latest[nid]["state"] == "SUSPECT":
                        st.latest[nid]["state"] = "CONFIRMED"

async def consume_bus(bus, feeder_id: str):
    import traceback
    while True:
        try:
            tel = await bus.get()
            tel.setdefault("feeder_id", feeder_id)
            await handle_telemetry(tel)
        except Exception:
            traceback.print_exc()  # never let one bad sample kill the loop
