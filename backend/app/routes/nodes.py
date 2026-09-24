"""GET /nodes, /nodes/{id}/history, POST /nodes (commission), DELETE /nodes/{id}."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..ingest import get_state
from ..bridge import commission_node, decommission_node

router = APIRouter()

class NodeIn(BaseModel):
    node_id: str
    lat: float
    lng: float
    span_m: float = 42
    after: str | None = None  # upstream neighbour id; None = tail

@router.get("/nodes")
def list_nodes(feeder_id: str = "KSEB-TVM-F12"):
    st = get_state(feeder_id)
    return list(st.latest.values())

@router.get("/nodes/{nid}/history")
def history(nid: str, feeder_id: str = "KSEB-TVM-F12", window: int = 300):
    return get_state(feeder_id).history(nid, window)

@router.post("/nodes", status_code=201)
def add_node(body: NodeIn):
    try:
        return commission_node(body.node_id, body.lat, body.lng, body.span_m, body.after)
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.delete("/nodes/{nid}")
def remove_node(nid: str):
    try:
        decommission_node(nid)
    except ValueError as e:
        raise HTTPException(404, str(e))
    return {"removed": nid}
