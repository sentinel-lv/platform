"""OTA artifact endpoints (registry stub; gateway verifies before flashing)."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from ..ota import OtaRegistry
from ..security import operator_required

router = APIRouter()
REG = OtaRegistry()

@router.post("/ota/{version}", status_code=201)
async def publish(version: str, signature: str = "", image: UploadFile | None = None,
                  actor=Depends(operator_required)):
    blob = await image.read() if image else b""
    if not blob:
        raise HTTPException(400, "empty image")
    return REG.publish(version, blob, signature)

@router.get("/ota")
def versions():
    return {"versions": REG.versions()}
