"""PATCH /nodes/{id}: operator-editable metadata, and what must stay immutable."""
from fastapi.testclient import TestClient

from app.main import app
from app.geo import geo

client = TestClient(app)


def _first_node() -> str:
    return geo.order()[0]


def test_meta_defaults_present_on_every_node():
    """Baseline feeder JSON predates these fields; load must normalise them."""
    for node in geo.nodes:
        assert "label" in node and "device_id" in node and "notes" in node


def test_patch_sets_label_and_device():
    nid = _first_node()
    r = client.patch(f"/nodes/{nid}", json={"label": "Pole outside St Mary's",
                                            "device_id": "ESP32-S3-0A14"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["label"] == "Pole outside St Mary's"
    assert body["device_id"] == "ESP32-S3-0A14"
    assert body["node_id"] == nid  # unchanged


def test_patch_is_partial_and_does_not_clear_siblings():
    nid = _first_node()
    client.patch(f"/nodes/{nid}", json={"label": "keep me", "notes": "and me"})
    client.patch(f"/nodes/{nid}", json={"device_id": "ESP32-S3-BEEF"})
    body = client.get(f"/nodes/{nid}/meta").json()
    assert body["label"] == "keep me"
    assert body["notes"] == "and me"
    assert body["device_id"] == "ESP32-S3-BEEF"


def test_node_id_is_not_editable():
    """Renaming a node would invalidate every recorded fault span."""
    nid = _first_node()
    r = client.patch(f"/nodes/{nid}", json={"node_id": "N-999"})
    # node_id is not on the model at all, so it is ignored rather than applied;
    # the node must still be reachable under its original id.
    assert client.get(f"/nodes/{nid}/meta").status_code == 200
    assert r.status_code in (200, 400)
    assert geo.get(nid)["node_id"] == nid


def test_empty_patch_is_rejected():
    r = client.patch(f"/nodes/{_first_node()}", json={})
    assert r.status_code == 400


def test_bad_span_rejected():
    r = client.patch(f"/nodes/{_first_node()}", json={"span_m": 0})
    assert r.status_code == 400


def test_unknown_node_is_404_on_meta():
    assert client.get("/nodes/N-404/meta").status_code == 404


def test_patch_unknown_node_is_400():
    r = client.patch("/nodes/N-404", json={"label": "ghost"})
    assert r.status_code == 400


def test_patch_is_audited():
    nid = _first_node()
    client.patch(f"/nodes/{nid}", json={"label": "audited"})
    rows = client.get("/audit?limit=20").json()
    assert any(r["action"] == "update_node" and r["detail"].get("node_id") == nid
               for r in rows), rows


def test_moving_a_node_updates_the_feeder_geometry():
    nid = _first_node()
    r = client.patch(f"/nodes/{nid}", json={"lat": 8.5299, "lng": 76.9399})
    assert r.status_code == 200
    geom = client.get(f"/feeders/{geo.feeder_id}").json()
    moved = next(n for n in geom["nodes"] if n["node_id"] == nid)
    assert round(moved["lat"], 4) == 8.5299
    # polyline is derived from node order, so it must move with it
    assert [round(c, 4) for c in geom["polyline"][0]] == [76.9399, 8.5299]
