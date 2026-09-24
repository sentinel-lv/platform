"""GET /feeders, /feeders/{id}, POST /feeders/{id}/mode, PATCH config (README §4 + v2 tuning)."""
import time
from fastapi import APIRouter, Depends, HTTPException
from .. import config as cfg
from ..audit import record
from ..geo import geo
from ..security import operator_required

router = APIRouter()

@router.get("/feeders")
def list_feeders():
    return [{"feeder_id": geo.feeder_id, "mode": cfg.get_mode(geo.feeder_id)}]

@router.get("/feeders/{fid}")
def get_feeder(fid: str):
    if fid != geo.feeder_id:
        raise HTTPException(404, "unknown feeder")
    out = geo.describe(mode=cfg.get_mode(fid), arbiter=cfg.get_config(fid).__dict__)
    out["tunable"] = {k: {"min": lo, "max": hi} for k, (lo, hi) in cfg.RANGES.items()}
    return out

@router.post("/feeders/{fid}/mode")
def set_mode(fid: str, mode: str, actor=Depends(operator_required)):
    if fid != geo.feeder_id:
        raise HTTPException(404, "unknown feeder")
    out = {"feeder_id": fid, "mode": cfg.set_mode(fid, mode)}
    record(actor, "set_mode", {"feeder_id": fid, "mode": out["mode"]},
           int(time.time() * 1000))
    return out

@router.patch("/feeders/{fid}/config")
def patch_feeder_config(fid: str, patch: dict, actor=Depends(operator_required)):
    if fid != geo.feeder_id:
        raise HTTPException(404, "unknown feeder")
    try:
        updated = cfg.patch_config(fid, patch)
    except ValueError as e:
        raise HTTPException(400, str(e))
    record(actor, "patch_config", {"feeder_id": fid, "patch": patch},
           int(time.time() * 1000))
    return {"feeder_id": fid, "arbiter": updated.__dict__}

@router.get("/audit")
def audit_log(limit: int = 100):
    from ..audit import listing
    return listing(limit)
