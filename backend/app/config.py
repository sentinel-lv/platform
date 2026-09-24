"""ArbiterConfig loading, per-feeder overrides (backend README §3)."""
import os
from .arbiter import ArbiterConfig

DEFAULTS = ArbiterConfig()
_per_feeder: dict[str, ArbiterConfig] = {}
_modes: dict[str, str] = {}  # feeder_id -> AUTO | ALERT_ONLY (default ALERT_ONLY)

def get_config(feeder_id: str) -> ArbiterConfig:
    return _per_feeder.get(feeder_id, DEFAULTS)

def get_mode(feeder_id: str) -> str:
    return _modes.get(feeder_id, os.getenv("FEEDER_MODE_DEFAULT", "ALERT_ONLY"))

def set_mode(feeder_id: str, mode: str) -> str:
    assert mode in ("AUTO", "ALERT_ONLY"), mode
    _modes[feeder_id] = mode
    return mode

RANGES = {
    "collapse_threshold_pct": (-90.0, -10.0),
    "sustain_cycles": (1, 20),
    "quorum_required": (1, 5),
    "quorum_window_ms": (200, 10000),
    "recovery_threshold_pct": (-60.0, -1.0),
}

def patch_config(feeder_id: str, patch: dict) -> ArbiterConfig:
    """Validated per-feeder override. Unknown keys and out-of-range values 400."""
    cur = _per_feeder.get(feeder_id, DEFAULTS)
    vals = {f: getattr(cur, f) for f in RANGES}
    veto = bool(patch.get("global_collapse_veto", cur.global_collapse_veto))
    for k, v in patch.items():
        if k == "global_collapse_veto":
            continue
        if k not in RANGES:
            raise ValueError(f"unknown field {k!r} (tunable: {sorted(RANGES)})")
        lo, hi = RANGES[k]
        if k in ("sustain_cycles", "quorum_required", "quorum_window_ms"):
            v = int(v)
        else:
            v = float(v)
        if not lo <= v <= hi:
            raise ValueError(f"{k}={v} outside [{lo},{hi}]")
        vals[k] = v
    cfg = ArbiterConfig(**vals, global_collapse_veto=veto)
    _per_feeder[feeder_id] = cfg
    return cfg

def simulate_enabled() -> bool:
    return os.getenv("ENABLE_SIMULATE", "1") == "1"
