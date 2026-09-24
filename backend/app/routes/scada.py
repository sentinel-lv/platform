"""GET /scada/points — IEC-104 read-only stub snapshot (see iec104.py)."""
from fastapi import APIRouter
from ..iec104 import scada_points
from ..ingest import get_state

router = APIRouter()

@router.get("/scada/points")
def points(feeder_id: str = "KSEB-TVM-F12"):
    st = get_state(feeder_id)
    ordered = [{"node_id": nid, **st.latest[nid]} for nid in st.ordered_ids if nid in st.latest]
    return {"feeder_id": feeder_id, "stub": "iec104-read-only", "points": scada_points(ordered)}
