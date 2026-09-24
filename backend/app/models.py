"""Pydantic models mirroring docs/PROTOCOL.md exactly. Do not invent fields."""
from typing import List, Literal, Optional, Tuple
from pydantic import BaseModel, Field

NodeStateStr = Literal["NORMAL", "SUSPECT", "CONFIRMED", "RECOVERED", "OFFLINE"]

class Telemetry(BaseModel):
    node_id: str = Field(pattern=r"^N-\d{3}$")
    feeder_id: str
    ts: int
    efield_rms: float = Field(ge=0.0, le=20.0)
    baseline: float
    deviation_pct: float = Field(ge=-100.0, le=100.0)
    battery_mv: int = Field(ge=2800, le=4200)
    rssi: int = Field(ge=-140, le=-30)
    temp_c: float = Field(ge=-10.0, le=60.0)
    state: NodeStateStr
    seq: int

class VoteItem(BaseModel):
    node_id: str
    agrees: bool
    deviation_pct: float

class Vote(BaseModel):
    feeder_id: str
    asserting_node: str
    ts: int
    votes: List[VoteItem]
    quorum_required: int
    quorum_met: bool

class Command(BaseModel):
    feeder_id: str
    action: Literal["ISOLATE", "RESTORE", "LOCKOUT", "TEST"]
    reason: Literal["quorum_confirmed", "manual", "scheduled_test", "watchdog"]
    fault_span: Optional[Tuple[str, str]] = None
    ts: int
    latency_ms: Optional[int] = None
    issued_by: str
    mode: Literal["AUTO", "ALERT_ONLY"]

class TrailItem(BaseModel):
    ts: int
    node: str
    state: str

class Event(BaseModel):
    event_id: str
    feeder_id: str
    type: Literal["CONDUCTOR_BREAK", "FALSE_POSITIVE_REJECTED", "NODE_OFFLINE", "LOW_BATTERY", "COMMS_LOSS"]
    ts_detected: int
    ts_confirmed: int
    fault_span: Optional[Tuple[str, str]] = None
    location: Optional[dict] = None
    isolated: bool
    latency_ms: Optional[int] = None
    trail: List[TrailItem] = []
    acknowledged_by: Optional[str] = None
