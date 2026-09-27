"""Ingest loop: simulator telemetry -> event-driven arbiter -> event (README §7.2-3)."""
import sys, pathlib, asyncio
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "simulator"))
from sim.feeder import Feeder
from sim.node import DT
from app import ingest, config
from app.events import reset_rate_limit

T0 = 1_757_030_400_123

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
        return t
    return asyncio.run(go())

def test_break_produces_isolate_in_auto_mode():
    ingest.states.clear(); ingest.event_log.clear(); reset_rate_limit("SLV-TVM-F12")
    config.set_mode("SLV-TVM-F12", "AUTO")
    f = Feeder(); f.break_from = "N-007"
    _drive(f, 12)
    isolates = [e for e in ingest.event_log if e["isolated"]]
    assert isolates, ingest.event_log
    ev = isolates[0]
    assert ev["fault_span"] == ["N-006", "N-007"], ev
    assert ev["latency_ms"] is not None and ev["latency_ms"] < 2000, ev
    config.set_mode("SLV-TVM-F12", "ALERT_ONLY")

def test_default_mode_never_isolates():
    ingest.states.clear(); ingest.event_log.clear(); reset_rate_limit("SLV-TVM-F12")
    config.set_mode("SLV-TVM-F12", "ALERT_ONLY")  # default per PROTOCOL veto 5
    f = Feeder(); f.break_from = "N-007"
    _drive(f, 12)
    assert not [e for e in ingest.event_log if e["isolated"]]

def test_rate_limit_second_break_suppressed():
    ingest.states.clear(); ingest.event_log.clear(); reset_rate_limit("SLV-TVM-F12")
    config.set_mode("SLV-TVM-F12", "AUTO")
    f = Feeder(); f.break_from = "N-007"
    _drive(f, 12)   # first ISOLATE
    f.reset(); f.break_from = "N-010"
    _drive(f, 12)   # second break 6 s later -> rate-limited, not isolated
    isolates = [e for e in ingest.event_log if e["isolated"]]
    assert len(isolates) == 1, ingest.event_log
    config.set_mode("SLV-TVM-F12", "ALERT_ONLY")

def test_rain_gust_rejects_no_isolate():
    ingest.states.clear(); ingest.event_log.clear(); reset_rate_limit("SLV-TVM-F12")
    for k in ("SLV-TVM-F12",):
        ingest._last_key[k] = None; ingest._saw_suspect[k] = False; ingest._isolated_episode[k] = False
    config.set_mode("SLV-TVM-F12", "AUTO")
    async def go():
        f = Feeder(); t = T0
        f.weather = 0.35  # gust: all touch SUSPECT, vetoed (global collapse)
        for _ in range(6):
            for n in f.nodes:
                tel = n.step(t, weather=0.35)
                if tel: await ingest.handle_telemetry(tel)
            t += int(DT * 1000)
        f.weather = 1.0   # recover
        for _ in range(90):  # RECOVERED needs 2 s + EWMA re-converge
            for n in f.nodes:
                tel = n.step(t, weather=1.0)
                if tel: await ingest.handle_telemetry(tel)
            t += int(DT * 1000)
    asyncio.run(go())
    assert not [e for e in ingest.event_log if e["isolated"]], ingest.event_log
    assert [e for e in ingest.event_log if e["type"] == "FALSE_POSITIVE_REJECTED"], ingest.event_log
    config.set_mode("SLV-TVM-F12", "ALERT_ONLY")

def test_true_break_reset_has_no_rejection():
    ingest.states.clear(); ingest.event_log.clear(); reset_rate_limit("SLV-TVM-F12")
    for k in ("SLV-TVM-F12",):
        ingest._last_key[k] = None; ingest._saw_suspect[k] = False; ingest._isolated_episode[k] = False
    config.set_mode("SLV-TVM-F12", "AUTO")
    f = Feeder(); f.break_from = "N-007"
    _drive(f, 12)
    assert [e for e in ingest.event_log if e["isolated"]]
    f.reset()  # crew restores: all back to NORMAL
    _drive(f, 6)
    assert not [e for e in ingest.event_log if e["type"] == "FALSE_POSITIVE_REJECTED"], ingest.event_log
    config.set_mode("SLV-TVM-F12", "ALERT_ONLY")

def test_recovery_frontier_never_fabricates_span():
    """1 s gust (votes still fresh) then recover: per-sample sweep must not emit spans."""
    ingest.states.clear(); ingest.event_log.clear(); reset_rate_limit("SLV-TVM-F12")
    for k in ("SLV-TVM-F12",):
        ingest._last_key[k] = None; ingest._saw_suspect[k] = False
        ingest._isolated_episode[k] = False; ingest._pending[k] = (None, 0)
    config.set_mode("SLV-TVM-F12", "AUTO")
    async def go():
        f = Feeder(); t = T0 + 5_000_000
        for _ in range(2):  # 1 s gust, all assert together
            for n in f.nodes:
                tel = n.step(t, weather=0.35)
                if tel: await ingest.handle_telemetry(tel)
            t += int(DT * 1000)
        for _ in range(10):  # recover: frontier sweeps one node per sample
            for n in f.nodes:
                tel = n.step(t, weather=1.0)
                if tel: await ingest.handle_telemetry(tel)
            t += int(DT * 1000)
    asyncio.run(go())
    spans = [e["fault_span"] for e in ingest.event_log if e["fault_span"]]
    assert spans == [], ingest.event_log
    config.set_mode("SLV-TVM-F12", "ALERT_ONLY")

def test_silent_node_raises_offline_alert():
    ingest.states.clear(); ingest.event_log.clear(); reset_rate_limit("SLV-TVM-F12")
    for k in ("SLV-TVM-F12",):
        ingest._last_key[k] = None; ingest._saw_suspect[k] = False
        ingest._isolated_episode[k] = False; ingest._pending[k] = (None, 0)
    config.set_mode("SLV-TVM-F12", "AUTO")
    async def go():
        f = Feeder(); t = T0 + 9_000_000
        for _ in range(6):  # all healthy first
            for n in f.nodes:
                tel = n.step(t, break_mask=1.0)
                if tel: await ingest.handle_telemetry(tel)
            t += int(DT * 1000)
        assert not ingest.event_log  # healthy hum: silent
        victim = f.by_id["N-007"]
        for _ in range(62):  # 31 s: N-007 quiet, rest keep humming
            for n in f.nodes:
                if n is victim:
                    continue
                tel = n.step(t, break_mask=1.0)
                if tel: await ingest.handle_telemetry(tel)
            t += int(DT * 1000)
        await ingest.reap_once(t)  # only the victim is stale
        off = [e for e in ingest.event_log if e["type"] == "NODE_OFFLINE"]
        assert off and off[0]["action"] == "ALERT", ingest.event_log
        assert not [e for e in ingest.event_log if e["isolated"]]
        # node comes back: recovery, not a false-positive rejection
        n_before = len(ingest.event_log)
        for _ in range(4):
            tel = victim.step(t, break_mask=1.0)
            if tel: await ingest.handle_telemetry(tel)
            t += int(DT * 1000)
        assert len(ingest.event_log) == n_before, ingest.event_log
    asyncio.run(go())
    config.set_mode("SLV-TVM-F12", "ALERT_ONLY")

def test_tail_break_minimum_quorum_fires_on_reeval():
    """2 voters = 2 transitions then silence: fires only via sustained re-eval."""
    ingest.states.clear(); ingest.event_log.clear(); reset_rate_limit("SLV-TVM-F12")
    for k in ("SLV-TVM-F12",):
        ingest._last_key[k] = None; ingest._saw_suspect[k] = False
        ingest._isolated_episode[k] = False; ingest._pending[k] = (None, 0)
    config.set_mode("SLV-TVM-F12", "AUTO")
    async def go():
        f = Feeder(); t = T0 + 11_000_000
        f.break_from = "N-011"  # only N-011 + N-012 collapse
        st = ingest.get_state("SLV-TVM-F12")
        for _ in range(8):
            for n in f.nodes:
                ids = [x.node_id for x in f.nodes]
                bm = 0.02 if ids.index(n.node_id) >= ids.index("N-011") else 1.0
                tel = n.step(t, break_mask=bm)
                if tel: await ingest.handle_telemetry(tel)
            # confirmer ticks inside the quorum window: steady verdict, no transitions
            await ingest._evaluate(st, "SLV-TVM-F12", t + 100, suppress_rejection=False)
            await ingest._evaluate(st, "SLV-TVM-F12", t + 200, suppress_rejection=False)
            t += int(DT * 1000)
    asyncio.run(go())
    isolates = [e for e in ingest.event_log if e["isolated"]]
    assert isolates and isolates[0]["fault_span"] == ["N-010", "N-011"], ingest.event_log
    config.set_mode("SLV-TVM-F12", "ALERT_ONLY")
