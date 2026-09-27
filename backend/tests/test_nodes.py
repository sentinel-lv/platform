"""Dynamic topology: commission mid-span, break across the new node (bridge)."""
import sys, asyncio, pathlib
import pytest
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "simulator"))
from sim.feeder import Feeder
from sim.node import DT
from app import ingest, config, bridge
from app.geo import geo
from app.events import reset_rate_limit

T0 = 1_757_040_400_123
BASE_ORDER = None

def setup_function(_):
    global BASE_ORDER
    if BASE_ORDER is None:
        BASE_ORDER = list(geo.order())
    # restore pristine 12-node topology between tests (module-global registry)
    geo.nodes = [dict(n) for n in _base_nodes()]
    ingest.states.clear(); ingest.event_log.clear()
    reset_rate_limit("SLV-TVM-F12")
    for k in ("SLV-TVM-F12",):
        ingest._last_key[k] = None; ingest._saw_suspect[k] = False
        ingest._isolated_episode[k] = False; ingest._pending[k] = (None, 0)
    config.set_mode("SLV-TVM-F12", "AUTO")
    bridge.detach_sim()

def _base_nodes():
    return [{"node_id": f"N-{i:03d}", "lat": 8.5240 + i * 0.0004,
             "lng": 76.9371 + i * 0.0007, "span_m": 42} for i in range(1, 13)]

def _drive(feeder, n_ticks, now=T0):
    async def go():
        t = now
        for _ in range(n_ticks):
            for n in feeder.nodes:
                ids = [x.node_id for x in feeder.nodes]
                bm = 0.02 if (feeder.break_from and ids.index(n.node_id) >= ids.index(feeder.break_from)) else 1.0
                tel = n.step(t, break_mask=bm)
                if tel:
                    await ingest.handle_telemetry(tel)
            t += int(DT * 1000)
    asyncio.run(go())

def test_commission_validation():
    with pytest.raises(ValueError):
        bridge.commission_node("BAD", 0, 0)
    bridge.commission_node("N-013", 0, 0)
    with pytest.raises(ValueError):
        bridge.commission_node("N-013", 0, 0)  # dup
    with pytest.raises(ValueError):
        bridge.commission_node("N-014", 0, 0, after="N-999")

def test_break_across_new_node_names_new_span():
    f = Feeder()
    bridge.attach_sim(f)
    bridge.commission_node("N-013", 8.5267, 76.9409, 42, after="N-006")
    assert [n.node_id for n in f.nodes][5:8] == ["N-006", "N-013", "N-007"]
    f.break_from = "N-007"  # wire down just past the new node
    _drive(f, 12)
    isolates = [e for e in ingest.event_log if e["isolated"]]
    assert isolates, ingest.event_log
    assert isolates[0]["fault_span"] == ["N-013", "N-007"], isolates[0]
    bridge.detach_sim()

def test_decommission_removes_everywhere():
    f = Feeder()
    bridge.attach_sim(f)
    bridge.commission_node("N-013", 0, 0)
    assert "N-013" in geo.order() and "N-013" in [n.node_id for n in f.nodes]
    bridge.decommission_node("N-013")
    assert "N-013" not in geo.order() and "N-013" not in [n.node_id for n in f.nodes]
    bridge.detach_sim()
