"""GET /nodes, /nodes/{id}/history, POST /nodes, PATCH /nodes/{id}, DELETE /nodes/{id}."""
import time

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..audit import record
from ..geo import geo
from ..ingest import get_state
from ..security import operator_required
from ..bridge import commission_node, decommission_node, update_node

router = APIRouter()

class NodeIn(BaseModel):
    node_id: str
    lat: float
    lng: float
    span_m: float = 42
    after: str | None = None  # upstream neighbour id; None = tail

class NodePatch(BaseModel):
    """Operator-editable fields. node_id is immutable — see geo.MUTABLE."""
    label: str | None = None
    device_id: str | None = None
    notes: str | None = None
    lat: float | None = None
    lng: float | None = None
    span_m: float | None = None


@router.get("/nodes")
def list_nodes(feeder_id: str = "SLV-TVM-F12"):
    st = get_state(feeder_id)
    return list(st.latest.values())

@router.get("/nodes/{nid}/history")
def history(nid: str, feeder_id: str = "SLV-TVM-F12", window: int = 300):
    return get_state(feeder_id).history(nid, window)

@router.post("/nodes", status_code=201)
def add_node(body: NodeIn):
    try:
        return commission_node(body.node_id, body.lat, body.lng, body.span_m, body.after)
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.get("/nodes/{nid}/meta")
def node_meta(nid: str):
    """Commissioning metadata for one node (label, bound device, placement)."""
    try:
        return geo.get(nid)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.patch("/nodes/{nid}")
def patch_node(nid: str, body: NodePatch, actor=Depends(operator_required)):
    fields = body.model_dump(exclude_none=True)
    if not fields:
        raise HTTPException(400, "no editable fields supplied")
    try:
        node = update_node(nid, **fields)
    except ValueError as e:
        raise HTTPException(400, str(e))
    record(actor, "update_node", {"node_id": nid, **fields}, int(time.time() * 1000))
    return node


@router.delete("/nodes/{nid}")
def remove_node(nid: str):
    try:
        decommission_node(nid)
    except ValueError as e:
        raise HTTPException(404, str(e))
    return {"removed": nid}
