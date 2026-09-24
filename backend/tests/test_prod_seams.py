"""Post-M1 seams: MQTT parse, archive, alert ladder, IEC stub, OTA registry."""
import sys, pathlib
import pytest
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from app.mqtt_ingest import parse_telemetry, enabled
from app.archive import FileArchive
from app.alerts import Ladder, FakeSender
from app.iec104 import scada_points, IOA_BASE_STATUS
from app.ota import OtaRegistry

def test_mqtt_parse_ok_and_rejects():
    t = "cc/feeder/KSEB-TVM-F12/node/N-007/telemetry"
    body = {"ts": 1, "efield_rms": 4.8, "baseline": 4.9, "deviation_pct": -2.0,
            "battery_mv": 3800, "rssi": -90, "temp_c": 31.0, "state": "NORMAL", "seq": 5}
    import json
    out = parse_telemetry(t, json.dumps(body))
    assert out["node_id"] == "N-007" and out["feeder_id"] == "KSEB-TVM-F12"
    with pytest.raises(ValueError):
        parse_telemetry("cc/nope", "{}")
    with pytest.raises(ValueError):
        parse_telemetry(t, "{bad json")
    with pytest.raises(ValueError):
        parse_telemetry(t, "{}")
    assert enabled() is False  # demo default: simulator owns ingest

def test_file_archive_roundtrip_and_prune(tmp_path):
    a = FileArchive(root=str(tmp_path), retention_days=7)
    a.append("telemetry", {"node_id": "N-001"}, day="2026-09-01")
    a.append("telemetry", {"node_id": "N-002"}, day="2026-09-01")
    assert [r["node_id"] for r in a.read_day("telemetry", "2026-09-01")] == ["N-001", "N-002"]
    a.prune(today="2026-09-20")
    assert a.read_day("telemetry", "2026-09-01") == []

def test_ladder_escalates_until_ack():
    s = FakeSender()
    lad = Ladder(sender=s, ack_timeout_s=300)
    lad.raise_event("evt_1", "BREAK N-006<->N-007", now_s=0)
    assert s.sent == [("crew", "BREAK N-006<->N-007")]
    assert lad.poll(now_s=299) == []
    assert lad.poll(now_s=300) == ["evt_1"]
    assert s.sent[-1][0] == "section-officer"
    lad.ack("evt_1")
    assert lad.poll(now_s=9999) == []

def test_scada_points_stable_ioa():
    rows = [{"node_id": "N-006", "state": "NORMAL", "efield_rms": 4.9, "battery_mv": 3800},
            {"node_id": "N-007", "state": "SUSPECT", "efield_rms": 0.1, "battery_mv": 3790}]
    pts = scada_points(rows)
    assert len(pts) == 6
    assert pts[0] == {"ioa": IOA_BASE_STATUS, "type": "M_SP_NA_1", "node_id": "N-006", "value": False}
    assert pts[3]["value"] is True  # suspect raises the point

def test_ota_publish_fetch_integrity(tmp_path):
    reg = OtaRegistry(root=str(tmp_path))
    meta = reg.publish("v0.2.0", b"\x00\x01firmware", "sig-abc")
    assert meta["size"] == 10 and len(meta["sha256"]) == 64
    blob, _ = reg.fetch("v0.2.0")
    assert blob == b"\x00\x01firmware"
    (tmp_path / "v0.2.0.bin").write_bytes(b"tampered")
    with pytest.raises(ValueError):
        reg.fetch("v0.2.0")

def test_archive_records_when_enabled(tmp_path, monkeypatch):
    import os
    monkeypatch.setenv("ARCHIVE_DIR", str(tmp_path))
    import asyncio
    from app import ingest as _ing
    _ing._archive_inst = None
    tel = {"node_id": "N-001", "feeder_id": "KSEB-TVM-F12", "ts": 1,
           "efield_rms": 4.8, "baseline": 4.9, "deviation_pct": -2.0,
           "battery_mv": 3800, "rssi": -90, "temp_c": 31.0,
           "state": "NORMAL", "seq": 1}
    asyncio.run(_ing.handle_telemetry(dict(tel)))
    arch = _ing._archive_inst
    import datetime
    assert arch is not None
    assert len(arch.read_day("telemetry", datetime.date.today().isoformat())) == 1
    _ing._archive_inst = None
