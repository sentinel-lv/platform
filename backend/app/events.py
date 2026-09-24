"""Event construction, trail assembly, latency computation (backend README §3).

Caller-side gates (PROTOCOL vetoes 4-5 live here, not in pure decide()):
  - veto 5: default ALERT_ONLY — ISOLATE downgraded to ALERT unless feeder opted into AUTO.
  - veto 4: max 1 ISOLATE/feeder/60 s without manual reset.
Cloud output is display/audit shadow only — the gateway decides for real.
"""
import itertools
from . import config as cfg

_last_isolate_ms: dict[str, int] = {}
_counter = itertools.count(1)

def build_event(feeder_id: str, decision, trail: list[dict], now_ms: int) -> dict:
    """Apply mode + rate-limit gates, return durable event dict (PROTOCOL §4.4)."""
    action, isolated = decision.action, False
    if action == "ISOLATE":
        if cfg.get_mode(feeder_id) != "AUTO":
            action = "ALERT"  # veto 5: utility opts into AUTO per feeder
        elif now_ms - _last_isolate_ms.get(feeder_id, -60_001) < 60_000:
            action = "ALERT"  # veto 4: rate limit
        else:
            isolated, _last_isolate_ms[feeder_id] = True, now_ms
    etype = ("CONDUCTOR_BREAK" if isolated
             else "FALSE_POSITIVE_REJECTED" if decision.reason in ("no_fault",) or "recover" in decision.reason
             else "NODE_OFFLINE" if "offline" in decision.reason
             else "COMMS_LOSS" if "stale" in decision.reason else "CONDUCTOR_BREAK")
    # trail SUSPECTs also surface as rejection lines when nothing isolates
    ts_detected = min([t["ts"] for t in trail], default=now_ms)
    return {
        "event_id": f"evt_{next(_counter):06d}", "feeder_id": feeder_id, "type": etype,
        "ts_detected": ts_detected, "ts_confirmed": now_ms,
        "fault_span": list(decision.fault_span) if decision.fault_span else None,
        "isolated": isolated, "latency_ms": decision.latency_ms,
        "trail": trail, "acknowledged_by": None,
        "action": action, "reason": decision.reason, "confidence": decision.confidence,
    }

def reset_rate_limit(feeder_id: str):
    _last_isolate_ms.pop(feeder_id, None)
