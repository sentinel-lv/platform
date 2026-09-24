"""GET /nodes, history, commission, + rename/reposition/bind/calibrate (inspector)."""
import time
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..ingest import get_state
from .. import bridge
from ..bridge import commission_node, decommission_node
from ..audit import record
from ..security import operator_required

router = APIRouter()

class NodeIn(BaseModel):
    node_id: str
    lat: float
    lng: float
    span_m: float = 42
    after: str | None = None  # upstream neighbour id; None = tail

class RenameIn(BaseModel):
    new_id: str

class RepositionIn(BaseModel):
    lat: float
    lng: float
    span_m: float | None = None   # None = keep
    after: str | None = "KEEP"    # "KEEP" = keep position; None = move to tail

class GainIn(BaseModel):
    gain: float  # 0.2–3.0 calibration trim

class BindIn(BaseModel):
    device_id: str | None = None  # None = unbind

@router.get("/nodes")
def list_nodes(feeder_id: str = "KSEB-TVM-F12"):
    st = get_state(feeder_id)
    return list(st.latest.values())

@router.get("/nodes/{nid}/history")
def history(nid: str, feeder_id: str = "KSEB-TVM-F12", window: int = 300):
    return get_state(feeder_id).history(nid, window)

@router.get("/nodes/{nid}")
def get_node(nid: str):
    from ..geo import geo
    node = geo.get_node(nid)
    if node is None:
        raise HTTPException(404, f"unknown node {nid!r}")
    st = get_state(geo.feeder_id)
    out = dict(node)
    out["telemetry"] = st.latest.get(nid)
    out["binding"] = bridge.get_binding(nid)
    return out

@router.post("/nodes", status_code=201)
def add_node(body: NodeIn):
    try:
        return commission_node(body.node_id, body.lat, body.lng, body.span_m, body.after)
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.delete("/nodes/{nid}")
def remove_node(nid: str, actor=Depends(operator_required)):
    try:
        decommission_node(nid)
    except ValueError as e:
        raise HTTPException(404, str(e))
    record(actor, "decommission_node", {"node_id": nid}, int(time.time() * 1000))
    return {"removed": nid}

@router.post("/nodes/{nid}/rename")
def rename(nid: str, body: RenameIn, actor=Depends(operator_required)):
    try:
        out = bridge.rename_node(nid, body.new_id)
    except ValueError as e:
        raise HTTPException(400, str(e))
    record(actor, "rename_node", {"old_id": nid, "new_id": body.new_id},
           int(time.time() * 1000))
    return out

@router.patch("/nodes/{nid}/position")
def reposition(nid: str, body: RepositionIn, actor=Depends(operator_required)):
    after = bridge.KEEP if body.after == "KEEP" else body.after
    try:
        out = bridge.reposition_node(nid, body.lat, body.lng, body.span_m, after)
    except ValueError as e:
        raise HTTPException(400, str(e))
    record(actor, "reposition_node",
           {"node_id": nid, "lat": body.lat, "lng": body.lng,
            "span_m": body.span_m, "after": body.after},
           int(time.time() * 1000))
    return out

@router.post("/nodes/{nid}/calibrate")
def calibrate(nid: str, body: GainIn, actor=Depends(operator_required)):
    try:
        out = bridge.set_gain(nid, body.gain)
    except ValueError as e:
        raise HTTPException(400, str(e))
    record(actor, "calibrate_node", {"node_id": nid, "gain": body.gain},
           int(time.time() * 1000))
    return out

@router.get("/bindings")
def bindings():
    return bridge.list_bindings()

@router.post("/nodes/{nid}/bind")
def bind(nid: str, body: BindIn, actor=Depends(operator_required)):
    try:
        out = bridge.bind_device(nid, body.device_id)
    except ValueError as e:
        raise HTTPException(400, str(e))
    record(actor, "bind_device", {"node_id": nid, "device_id": body.device_id},
           int(time.time() * 1000))
    return out
