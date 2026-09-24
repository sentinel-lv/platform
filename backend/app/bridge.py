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

def decommission_node(node_id) -> None:
    geo.remove_node(node_id)
    if sim_feeder is not None and node_id in sim_feeder.by_id:
        idx = [n.node_id for n in sim_feeder.nodes].index(node_id)
        del sim_feeder.nodes[idx]
        del sim_feeder.by_id[node_id]
    st = get_state(geo.feeder_id)
    st.set_order(geo.order())
    st.latest.pop(node_id, None)
    st.suspect_since.pop(node_id, None)

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
