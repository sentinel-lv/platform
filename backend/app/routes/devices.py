"""Device registry: provision/list/revoke per-device credentials (mTLS seam)."""
import time
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from .. import security as sec
from ..audit import record
from ..security import operator_required

router = APIRouter()

class ProvisionIn(BaseModel):
    device_id: str
    fingerprint: str  # SHA-256 of the device client certificate

@router.post("/devices", status_code=201)
def provision(body: ProvisionIn, actor=Depends(operator_required)):
    try:
        out = sec.register_device(body.device_id, body.fingerprint)
    except ValueError as e:
        raise HTTPException(400, str(e))
    record(actor, "provision_device", {"device_id": body.device_id},
           int(time.time() * 1000))
    return out

@router.get("/devices")
def list_all():
    return sec.list_devices()

@router.delete("/devices/{did}")
def revoke(did: str, actor=Depends(operator_required)):
    try:
        sec.revoke_device(did)
    except ValueError as e:
        raise HTTPException(404, str(e))
    record(actor, "revoke_device", {"device_id": did}, int(time.time() * 1000))
    return {"revoked": did}
