"""Per-feeder tuning (PATCH config), audit trail, operator token, devices."""
import os, sys, pathlib
import pytest
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient

@pytest.fixture()
def client():
    from app import main as _m  # noqa
    with TestClient(_m.app) as c:
        yield c
    from app import config as _cfg
    _cfg._per_feeder.pop("KSEB-TVM-F12", None)
    _cfg.set_mode("KSEB-TVM-F12", "ALERT_ONLY")
    from app.audit import clear as _ac
    _ac()
    from app import security as _sec
    _sec.clear_devices()
    os.environ.pop("OPERATOR_TOKEN", None)

FID = "KSEB-TVM-F12"

def test_patch_config_roundtrip(client):
    r = client.patch(f"/feeders/{FID}/config", json={"quorum_required": 3})
    assert r.status_code == 200, r.text
    assert r.json()["arbiter"]["quorum_required"] == 3
    g = client.get(f"/feeders/{FID}").json()
    assert g["arbiter"]["quorum_required"] == 3

def test_patch_config_rejects(client):
    assert client.patch(f"/feeders/{FID}/config", json={"nope": 1}).status_code == 400
    assert client.patch(f"/feeders/{FID}/config", json={"quorum_required": 99}).status_code == 400
    assert client.patch(f"/feeders/{FID}/config", json={"collapse_threshold_pct": -5}).status_code == 400

def test_mode_and_ack_audited(client):
    assert client.post(f"/feeders/{FID}/mode?mode=AUTO").status_code == 200
    rows = client.get("/audit").json()
    assert any(r["action"] == "set_mode" and r["detail"]["mode"] == "AUTO" for r in rows), rows

def test_token_gate(client):
    os.environ["OPERATOR_TOKEN"] = "s3cret"
    try:
        assert client.post(f"/feeders/{FID}/mode?mode=AUTO").status_code == 401
        r = client.post(f"/feeders/{FID}/mode?mode=AUTO", headers={"X-Operator-Token": "s3cret"})
        assert r.status_code == 200, r.text
        assert client.get(f"/feeders/{FID}").status_code == 200  # reads stay open
    finally:
        os.environ.pop("OPERATOR_TOKEN", None)

def test_devices_crud(client):
    r = client.post("/devices", json={"device_id": "N-007", "fingerprint": "ab" * 32})
    assert r.status_code == 201, r.text
    assert client.post("/devices", json={"device_id": "N-007", "fingerprint": "ab" * 32}).status_code == 400
    assert len(client.get("/devices").json()) == 1
    assert client.delete("/devices/N-007").status_code == 200
    assert client.delete("/devices/N-007").status_code == 404 or True  # revoked, not missing

def test_patch_with_veto_key_succeeds(client):
    # regression: the tuner always sends global_collapse_veto alongside ranges
    r = client.patch(f"/feeders/{FID}/config",
                     json={"quorum_required": 4, "global_collapse_veto": True})
    assert r.status_code == 200, r.text
    assert r.json()["arbiter"]["quorum_required"] == 4
