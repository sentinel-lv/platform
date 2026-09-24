"""GET /events, POST /events/{id}/ack."""
import time
from fastapi import APIRouter, Depends, HTTPException
from ..ingest import event_log
from ..audit import record
from ..security import operator_required

router = APIRouter()

@router.get("/events")
def list_events(feeder_id: str = "KSEB-TVM-F12", limit: int = 50):
    return [e for e in reversed(event_log) if e["feeder_id"] == feeder_id][:limit]

@router.post("/events/{eid}/ack")
def ack(eid: str, by: str = "crew-1", actor=Depends(operator_required)):
    for e in event_log:
        if e["event_id"] == eid:
            e["acknowledged_by"] = by
            record(actor, "ack_event", {"event_id": eid, "by": by},
                   int(time.time() * 1000))
            return e
    raise HTTPException(404, "unknown event")
