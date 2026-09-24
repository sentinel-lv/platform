"""Whole-table coverage (simulator README §4/§7): every scenario -> its
arbiter outcome, plus the 30-minute drift run (acceptance #4: no
drift-induced false SUSPECT). Fast: direct stepping, no sleeps."""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "backend"))
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from sim.feeder import Feeder
from sim.node import DT
from app.arbiter import ArbiterConfig, NodeState, decide

T0 = 1_757_050_400_123
CFG = ArbiterConfig()

def _snap(feeder, now):
    out = []
    for n in feeder.nodes:
        st = "OFFLINE" if n.offline else n.state
        out.append(NodeState(n.node_id, st, n.deviation, n.suspect_ts if st in ("SUSPECT", "CONFIRMED") else now))
    return out

def _ticks(feeder, k, now, weather=None, break_from=None, veg=None):
    if weather is not None:
        feeder.weather = weather
    if break_from is not None:
        feeder.break_from = break_from
    if veg is not None:
        feeder.veg_node = veg
    t = now
    for _ in range(k):
        for n in feeder.nodes:
            w = feeder.weather * (0.55 if feeder.veg_node == n.node_id else 1.0)
            ids = [x.node_id for x in feeder.nodes]
            bm = 0.02 if (feeder.break_from and ids.index(n.node_id) >= ids.index(feeder.break_from)) else 1.0
            n.step(t, weather=w, break_mask=bm, epoch_s=(t - T0) / 1000.0)
        t += int(DT * 1000)
    return t

def _verdict(feeder, now):
    return decide(_snap(feeder, now), now, CFG)

def test_vegetation_never_isolates_and_reads_midband():
    f = Feeder()
    t = _ticks(f, 20, T0, veg="N-007")
    n = f.by_id["N-007"]
    assert -55 < n.deviation < -35, n.deviation  # visible dip, far from -60%
    assert _verdict(f, t).action != "ISOLATE"

def test_transient_spike_no_isolate():
    f = Feeder()
    t = _ticks(f, 2, T0, weather=0.3)   # 1 s deep dip (harsher than the 300 ms spec)
    t = _ticks(f, 6, t, weather=1.0)    # recover
    assert _verdict(f, t).action != "ISOLATE"

def test_offline_node_stops_and_others_healthy():
    f = Feeder()
    f.by_id["N-007"].offline = True
    t = _ticks(f, 4, T0)
    assert f.by_id["N-007"].step(t, break_mask=1.0) is None
    assert all(n.state == "NORMAL" for n in f.nodes if n.node_id != "N-007")

def test_low_battery_reports_not_trips():
    f = Feeder()
    f.by_id["N-007"].battery_mv = 3100
    t = _ticks(f, 4, T0)
    tel = f.by_id["N-007"].telemetry("KSEB-TVM-F12", t)
    assert tel["battery_mv"] == 3100 and tel["state"] == "NORMAL"
    assert _verdict(f, t).action != "ISOLATE"

def test_reset_returns_all_normal():
    f = Feeder()
    t = _ticks(f, 8, T0, break_from="N-007")
    assert any(n.state != "NORMAL" for n in f.nodes)
    f.reset()
    t = _ticks(f, 4, t)
    assert all(n.state == "NORMAL" for n in f.nodes)
    assert _verdict(f, t).action == "NONE"

def test_thirty_minute_drift_no_false_suspect():
    f = Feeder()
    worst = 0.0
    t = T0
    for _ in range(3600):  # 30 min @ 2 Hz, epoch advances 1800 s (diurnal moves)
        for n in f.nodes:
            n.step(t, weather=1.0, break_mask=1.0, epoch_s=(t - T0) / 1000.0)
            worst = max(worst, abs(n.deviation))
            assert n.state == "NORMAL", (n.node_id, n.state, n.deviation)
        t += int(DT * 1000)
    assert worst < 30.0, worst  # noise + diurnal stay far from the 60% gate
