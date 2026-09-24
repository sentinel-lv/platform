"""Operator auth (opt-in) + device registry (mTLS provisioning seam).

Demo default: OPEN (no token configured) so the M1 flow works untouched.
Production: set OPERATOR_TOKEN — mutating routes (mode, config, simulate,
ack, OTA upload) then require `X-Operator-Token`. Device registry holds
per-device certificate fingerprints for the MQTT mTLS layer (provisioning
flow UI/CLI lands here later; storage is in-memory for the demo).
"""
import os
import time
from fastapi import Header, HTTPException

_devices: dict[str, dict] = {}  # device_id -> {fingerprint, provisioned_ts, revoked}

def operator_required(x_operator_token: str | None = Header(default=None)):
    want = os.getenv("OPERATOR_TOKEN", "")
    if not want:
        return "anonymous-demo"
    if x_operator_token != want:
        raise HTTPException(401, "operator token required")
    return "operator"

def register_device(device_id: str, fingerprint: str) -> dict:
    if device_id in _devices and not _devices[device_id].get("revoked"):
        raise ValueError(f"{device_id} already provisioned")
    _devices[device_id] = {"fingerprint": fingerprint,
                           "provisioned_ts": int(time.time() * 1000),
                           "revoked": False}
    return {"device_id": device_id, **_devices[device_id]}

def revoke_device(device_id: str):
    if device_id not in _devices:
        raise ValueError(f"unknown device {device_id!r}")
    _devices[device_id]["revoked"] = True

def list_devices() -> list[dict]:
    return [{"device_id": k, **v} for k, v in _devices.items()]

def clear_devices():
    _devices.clear()
