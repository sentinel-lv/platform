"""Node inspector ops: rename, reposition, calibrate gain, ESP32 bind (bridge + HTTP)."""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient


def _fresh_client():
    from app import main as _m  # noqa
    from app import ingest as _ing
    from app import bridge as _br
    from app.geo import geo as _geo
    from app import security as _sec
    from app.audit import clear as _ac
    _geo.nodes = [
        {"node_id": f"N-{i:03d}", "lat": 8.5240 + i * 0.0004,
         "lng": 76.9371 + i * 0.0007, "span_m": 42} for i in range(1, 13)
    ]
    _ing.states.clear()
    _ing.event_log.clear()
    _sec.clear_devices()
    _br.clear_bindings()
    _br.detach_sim()
    _ac()
    c = TestClient(_m.app)
    c.__enter__()
    return c


def _close(c):
    c.__exit__()


def test_rename_moves_everything():
    c = _fresh_client()
    try:
        r = c.post("/nodes/N-007/rename", json={"new_id": "N-020"})
        assert r.status_code == 200, r.text
        g = c.get("/feeders/KSEB-TVM-F12").json()
        assert "N-020" in [n["node_id"] for n in g["nodes"]]
        assert "N-007" not in [n["node_id"] for n in g["nodes"]]
        # validation: bad format, dup, unknown
        assert c.post("/nodes/N-020/rename", json={"new_id": "BAD"}).status_code == 400
        assert c.post("/nodes/N-020/rename", json={"new_id": "N-006"}).status_code == 400
        assert c.post("/nodes/N-999/rename", json={"new_id": "N-021"}).status_code == 400
        rows = c.get("/audit").json()
        assert any(x["action"] == "rename_node" for x in rows), rows
    finally:
        _close(c)


def test_reposition_moves_and_reslots():
    c = _fresh_client()
    try:
        r = c.patch("/nodes/N-009/position",
                    json={"lat": 8.53, "lng": 76.95, "span_m": 55, "after": "N-003"})
        assert r.status_code == 200, r.text
        g = c.get("/feeders/KSEB-TVM-F12").json()
        ids = [n["node_id"] for n in g["nodes"]]
        assert ids.index("N-009") == ids.index("N-003") + 1, ids
        moved = [n for n in g["nodes"] if n["node_id"] == "N-009"][0]
        assert moved["lat"] == 8.53 and moved["span_m"] == 55
        assert c.patch("/nodes/N-009/position",
                       json={"lat": 0, "lng": 0, "after": "N-999"}).status_code == 400
        assert c.patch("/nodes/N-009/position",
                       json={"lat": 0, "lng": 0, "after": "N-009"}).status_code == 400
    finally:
        _close(c)


def test_calibrate_gain_range_and_echo():
    c = _fresh_client()
    try:
        r = c.post("/nodes/N-007/calibrate", json={"gain": 1.5})
        assert r.status_code == 200, r.text
        assert r.json()["gain"] == 1.5
        assert c.post("/nodes/N-007/calibrate", json={"gain": 9.0}).status_code == 400
        assert c.post("/nodes/N-999/calibrate", json={"gain": 1.2}).status_code == 400
        g = c.get("/feeders/KSEB-TVM-F12").json()
        n7 = [n for n in g["nodes"] if n["node_id"] == "N-007"][0]
        assert n7["gain"] == 1.5
    finally:
        _close(c)


def test_bind_device_registry_flow():
    c = _fresh_client()
    try:
        # unprovisioned device refused
        assert c.post("/nodes/N-007/bind", json={"device_id": "ESP32-A"}).status_code == 400
        assert c.post("/devices", json={"device_id": "ESP32-A", "fingerprint": "ab" * 32}).status_code == 201
        r = c.post("/nodes/N-007/bind", json={"device_id": "ESP32-A"})
        assert r.status_code == 200, r.text
        # same ESP32 cannot drive two poles
        assert c.post("/devices", json={"device_id": "ESP32-B", "fingerprint": "cd" * 32}).status_code == 201
        assert c.post("/nodes/N-008/bind", json={"device_id": "ESP32-A"}).status_code == 400
        assert c.post("/nodes/N-008/bind", json={"device_id": "ESP32-B"}).status_code == 200
        bl = {b["node_id"]: b["device_id"] for b in c.get("/bindings").json()}
        assert bl.get("N-007") == "ESP32-A" and bl.get("N-008") == "ESP32-B"
        # unbind
        assert c.post("/nodes/N-007/bind", json={"device_id": None}).status_code == 200
        # decommission clears the binding row
        c.delete("/nodes/N-008")
    finally:
        _close(c)


def test_bridge_gain_applies_to_sim_signal():
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "simulator"))
    from sim.feeder import Feeder
    from app import bridge as _br
    import asyncio
    from app import ingest as _ing, config as _cfg
    from app.events import reset_rate_limit
    f = Feeder()
    _br.attach_sim(f)
    try:
        _br.set_gain("N-007", 0.5)
        _cfg.set_mode("KSEB-TVM-F12", "ALERT_ONLY")
        reset_rate_limit("KSEB-TVM-F12")

        async def go():
            for _ in range(4):
                await f.tick_once(1_757_040_400_123, 100.0)

        asyncio.run(go())
        got = {}

        async def drain():
            while f.bus.qsize():
                t = await f.bus.get()
                got[t["node_id"]] = t["efield_rms"]

        asyncio.run(drain())
        assert got["N-007"] < got["N-006"] * 0.75, got
    finally:
        _br.detach_sim()
        _br.clear_bindings()
