"""Scenario -> arbiter outcomes (simulator README §7 + vector table).

Faithful harness: the gateway runs decide() event-driven on EVERY telemetry
tick, so tests step tick-by-tick and capture the first firing decision —
exactly like production. Sustain = 5 ticks (2.5 s); quorum window = 1500 ms.
"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "backend"))
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from sim.feeder import Feeder
from sim.node import DT
from app.arbiter import ArbiterConfig, NodeState, decide

T0 = 1_757_030_400_123

def _snapshot(feeder, now_ms):
    cfg = ArbiterConfig()
    nodes = []
    for n in feeder.nodes:
        st = "OFFLINE" if n.offline else n.state
        ts = n.suspect_ts if st in ("SUSPECT", "CONFIRMED") else now_ms
        nodes.append(NodeState(n.node_id, st, n.deviation, ts))
    return decide(nodes, now_ms, cfg)

def _step(feeder, now_ms):
    for n in feeder.nodes:
        w = feeder.weather * (0.55 if feeder.veg_node == n.node_id else 1.0)
        ids = [x.node_id for x in feeder.nodes]
        bm = 0.02 if (feeder.break_from and ids.index(n.node_id) >= ids.index(feeder.break_from)) else 1.0
        n.step(now_ms, weather=w, break_mask=bm)

def _run_event_driven(feeder, n_ticks, now=T0):
    """Returns (first_firing_decision, tick_index, now_at_firing, final_decision, final_now)."""
    t, first, first_tick = now, None, None
    for k in range(n_ticks):
        _step(feeder, t)
        d = _snapshot(feeder, t)
        if first is None and d.action in ("ALERT", "ISOLATE"):
            first, first_tick = d, k
        last = d
        t += int(DT * 1000)
    return first, first_tick, first, last, t - int(DT * 1000)

def test_break_mid_feeder_isolates():
    f = Feeder()
    f.break_from = "N-007"
    first, tick, _, last, _ = _run_event_driven(f, 12)
    assert first is not None, "arbiter never fired"
    assert first.action == "ISOLATE" and first.fault_span == ("N-006", "N-007"), first
    assert first.latency_ms is not None and first.latency_ms < 2000, first

def test_isolate_latches_confirmed():
    f = Feeder()
    f.break_from = "N-007"
    first, tick, _, _, _ = _run_event_driven(f, 12)
    assert first.action == "ISOLATE", first
    f.apply_decision(first)              # nodes -> CONFIRMED (latched, no expiry)
    _, _, _, last, _ = _run_event_driven(f, 40)
    assert last.action == "ISOLATE" and last.fault_span == ("N-006", "N-007"), last

def test_rain_recovers_no_isolate():
    f = Feeder()
    f.weather = 0.75                     # all nodes -25%: above -60% threshold
    first, _, _, last, _ = _run_event_driven(f, 20)
    assert (first is None or first.action != "ISOLATE"), first
    assert last.action != "ISOLATE", last

def test_substation_outage_veto():
    f = Feeder()
    f.break_from = "N-001"               # every node collapses
    first, _, _, last, _ = _run_event_driven(f, 12)
    assert last.action == "NONE" and "global_collapse" in last.reason, last

def test_telemetry_keys():
    f = Feeder()
    tel = f.nodes[0].step(T0)
    assert set(tel) == {"node_id","feeder_id","ts","efield_rms","baseline","deviation_pct",
                        "battery_mv","rssi","temp_c","state","seq"}

def test_add_node_midspan_order_and_telemetry():
    from sim.feeder import Feeder
    f = Feeder()
    f.add_node("N-013", lat=8.5267, lng=76.9409, after="N-006")
    ids = [n.node_id for n in f.nodes]
    assert ids[5:8] == ["N-006", "N-013", "N-007"]
    t = T0
    for _ in range(4):
        for n in f.nodes:
            n.step(t, weather=1.0, break_mask=1.0)
        t += int(DT * 1000)
    assert f.by_id["N-013"].state == "NORMAL", (f.by_id["N-013"].state, f.by_id["N-013"].deviation)
    assert len(f.by_id["N-013"].telemetry("KSEB-TVM-F12", t)) == 11
