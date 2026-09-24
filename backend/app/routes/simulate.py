"""POST /simulate/{scenario} — demo build only, behind ENABLE_SIMULATE flag."""
from fastapi import APIRouter, Depends, HTTPException
from .. import config as cfg
from ..bridge import run_scenario
from ..security import operator_required

router = APIRouter()

@router.post("/simulate/{scenario}")
async def simulate(scenario: str, actor=Depends(operator_required)):
    if not cfg.simulate_enabled():
        raise HTTPException(403, "simulate disabled in production build")
    try:
        started = await run_scenario(scenario)
    except ValueError as e:
        raise HTTPException(404, str(e))
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    return {"started": started}
