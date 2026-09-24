"""Simulator <-> backend bridge: the swappable ingest seam.

Demo: the lifespan attaches the in-process simulator Feeder; production
attaches nothing and an MQTT loop pushes into handle_telemetry() instead —
same function, same validation, same event pipeline. Topology operations
go through here so the geo registry, the arbiter snapshot order and the
simulator stay in lockstep. A node never seen before is appended at the
tail (self-registration — the path real hardware takes on first contact).
"""
import asyncio
from .geo import geo
from .ingest import get_state, handle_telemetry

sim_feeder = None  # simulator Feeder when attached (demo only)
_current: asyncio.Task | None = None

def attach_sim(feeder):
    global sim_feeder
    sim_feeder = feeder
    st = get_state(feeder.feeder_id)
    st.set_order([n.node_id for n in feeder.nodes])

def detach_sim():
    global sim_feeder
    sim_feeder = None

def commission_node(node_id, lat, lng, span_m=42, after=None) -> dict:
    node = geo.add_node(node_id, lat, lng, span_m, after)  # validates first
    if sim_feeder is not None:
        try:
            sim_feeder.add_node(node_id, lat, lng, span_m, after)
        except ValueError:
            pass  # already emitting (e.g. restarted sim); registry wins
    st = get_state(geo.feeder_id)
    st.set_order(geo.order())
    return node

class _Keep:
    pass

KEEP = _Keep()  # omit = keep current value (vs None = tail/unset)

# node_id -> ESP32 hardware binding + per-node gain trim (demo in-memory;
# production persists with the commissioning record). Gain multiplies the
# simulator's efield output; binding names the /devices entry for this pole.
_bindings: dict[str, dict] = {}


def _sync_order():
    st = get_state(geo.feeder_id)
    st.set_order(geo.order())


def get_binding(node_id) -> dict:
    return {
        "node_id": node_id,
        "device_id": _bindings.get(node_id, {}).get("device_id"),
        "gain": _bindings.get(node_id, {}).get("gain", 1.0),
    }


def list_bindings() -> list[dict]:
    return [
        {"node_id": n, **{"device_id": b.get("device_id"), "gain": b.get("gain", 1.0)}}
        for n, b in _bindings.items()
    ]


def clear_bindings():
    _bindings.clear()


def rename_node(old_id, new_id) -> dict:
    """Real rename across geo + sim + ring buffers. Arbiter order follows."""
    node = geo.rename_node(old_id, new_id)  # validates first
    if sim_feeder is not None and old_id in sim_feeder.by_id:
        sim = sim_feeder.by_id.pop(old_id)
        sim.node_id = new_id
        sim._rng = sim._rng  # keep noise stream; identity only
        sim_feeder.by_id[new_id] = sim
    st = get_state(geo.feeder_id)
    for store in (st.latest, st.last_seen, st.suspect_since):
        if old_id in store:
            store[new_id] = store.pop(old_id)
    if old_id in st.ring:
        st.ring[new_id] = st.ring.pop(old_id)
    if old_id in st.ordered_ids:
        st.ordered_ids[st.ordered_ids.index(old_id)] = new_id
    if old_id in _bindings:
        _bindings[new_id] = _bindings.pop(old_id)
    _sync_order()
    return node


def reposition_node(node_id, lat, lng, span_m=KEEP, after=KEEP) -> dict:
    node = geo.reposition_node(
        node_id, lat, lng,
        span_m=KEEP if span_m is KEEP else span_m,
        after=KEEP if after is KEEP else after,
    )
    if sim_feeder is not None and node_id in sim_feeder.by_id:
        sim = sim_feeder.by_id[node_id]
        sim.lat, sim.lng = float(lat), float(lng)
        if span_m is not KEEP and span_m is not None:
            sim.span_m = float(span_m)
        if after is not KEEP:
            sim_feeder.nodes.remove(sim)
            if after is None:
                sim_feeder.nodes.append(sim)
            else:
                ids = [n.node_id for n in sim_feeder.nodes]
                sim_feeder.nodes.insert(ids.index(after) + 1, sim)
    _sync_order()
    return node


def decommission_node(node_id) -> None:
    geo.remove_node(node_id)
    if sim_feeder is not None and node_id in sim_feeder.by_id:
        idx = [n.node_id for n in sim_feeder.nodes].index(node_id)
        del sim_feeder.nodes[idx]
        del sim_feeder.by_id[node_id]
    st = get_state(geo.feeder_id)
    st.set_order(geo.order())
    st.latest.pop(node_id, None)
    st.last_seen.pop(node_id, None)
    st.ring.pop(node_id, None)
    st.suspect_since.pop(node_id, None)
    _bindings.pop(node_id, None)


def set_gain(node_id, gain: float) -> dict:
    """Per-node calibration trim. 1.0 = unity; range clamped 0.2–3.0."""
    if node_id not in geo.order():
        raise ValueError(f"unknown node {node_id!r}")
    g = float(gain)
    if not 0.2 <= g <= 3.0:
        raise ValueError(f"gain={gain} outside [0.2,3.0]")
    _bindings.setdefault(node_id, {})["gain"] = g
    return get_binding(node_id)


def bind_device(node_id, device_id: str | None) -> dict:
    """Bind (or unbind with None) an ESP32 device registry entry to a pole."""
    from . import security as sec
    if node_id not in geo.order():
        raise ValueError(f"unknown node {node_id!r}")
    if device_id is None:
        _bindings.setdefault(node_id, {})["device_id"] = None
        return get_binding(node_id)
    known = {d["device_id"] for d in sec.list_devices()}
    if device_id not in known:
        raise ValueError(f"unknown device {device_id!r} (provision via POST /devices first)")
    for nid, b in _bindings.items():
        if nid != node_id and b.get("device_id") == device_id:
            raise ValueError(f"{device_id} already bound to {nid}")
    _bindings.setdefault(node_id, {})["device_id"] = device_id
    return get_binding(node_id)

async def run_scenario(scenario: str):
    """Start a scenario coroutine, preempting any running one. Returns task."""
    import sys
    import pathlib
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "simulator"))
    from sim.scenarios import SCENARIOS
    if scenario not in SCENARIOS:
        raise ValueError(f"unknown scenario (try {sorted(SCENARIOS)})")
    if sim_feeder is None:
        raise RuntimeError("simulator not running")
    global _current
    if _current and not _current.done():
        _current.cancel()  # demo endpoint: new scenario preempts
        try:
            await _current
        except (asyncio.CancelledError, Exception):
            pass
    coro = SCENARIOS[scenario](sim_feeder)
    _current = asyncio.create_task(coro)
    return scenario
