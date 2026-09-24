"""decide() — pure, no I/O. THE core file. Must match gateway/src/arbiter.c.

See docs/PROTOCOL.md §5 for signature, defaults and veto rules.

Vetoes 1-3 + span computation live here (pure snapshot logic).
Vetoes 4 (rate limit: max 1 ISOLATE/feeder/60s) and 5 (ALERT_ONLY default)
are enforced by the CALLER (backend/app/events.py, gateway safety.c),
which holds last-isolate time + per-feeder mode — decide() stays pure.
"""
from dataclasses import dataclass
from typing import Optional

ASSERTED = ("SUSPECT", "CONFIRMED")

@dataclass(frozen=True)
class ArbiterConfig:
    collapse_threshold_pct: float = -60.0
    sustain_cycles: int = 5
    quorum_required: int = 2
    quorum_window_ms: int = 1500
    recovery_threshold_pct: float = -20.0
    global_collapse_veto: bool = True

@dataclass(frozen=True)
class NodeState:
    node_id: str
    state: str  # NORMAL | SUSPECT | CONFIRMED | RECOVERED | OFFLINE
    deviation_pct: float = 0.0
    ts: int = 0  # last SUSPECT-assert time (ms); last sample otherwise

@dataclass(frozen=True)
class Decision:
    action: str  # NONE | ALERT | ISOLATE
    reason: str
    fault_span: Optional[tuple]  # (upstream, downstream) | None
    latency_ms: Optional[int]
    confidence: float  # 0.0-1.0

def _is_healthy(n: NodeState, cfg: ArbiterConfig) -> bool:
    return n.state in ("NORMAL", "RECOVERED") and n.deviation_pct > cfg.collapse_threshold_pct

def _is_asserted(n: NodeState, cfg: ArbiterConfig, now_ms: int) -> bool:
    if n.state not in ASSERTED:
        return False
    if n.deviation_pct > cfg.collapse_threshold_pct:
        return False
    if n.state == "CONFIRMED":
        return True  # latched quorum: does not expire (cleared only by reset/RESTORE)
    if now_ms - n.ts > cfg.quorum_window_ms:
        return False  # SUSPECT vote expired (mesh collection window)
    return True

def decide(nodes: list, now_ms: int, config: ArbiterConfig = ArbiterConfig()) -> Decision:
    """Pure snapshot arbiter. nodes ordered upstream → downstream."""
    cfg = config
    if not nodes:
        return Decision("NONE", "no_data", None, None, 1.0)

    active = [n for n in nodes if n.state != "OFFLINE"]
    offline = [n for n in nodes if n.state == "OFFLINE"]
    if not active:
        # Whole feeder silent at once = link/gateway outage, not N dead nodes.
        # One alarm row, never a trip, never per-node spam (rule 1 spirit).
        return Decision("ALERT", "all_nodes_stale", None, None, 0.6)

    # Veto 1 — global collapse: every active node asserted => substation outage, never trip.
    if cfg.global_collapse_veto and len(active) >= 2 and all(
        n.state in ASSERTED and n.deviation_pct <= cfg.collapse_threshold_pct for n in active
    ):
        return Decision("NONE", "global_collapse_veto", None, None, 0.95)

    # Find NORMAL→SUSPECT boundaries (upstream healthy, downstream asserted).
    boundaries = []  # list of index i meaning span nodes[i] -> nodes[i+1]
    for i in range(len(nodes) - 1):
        if nodes[i].state == "OFFLINE" or nodes[i + 1].state == "OFFLINE":
            continue
        if _is_healthy(nodes[i], cfg) and _is_asserted(nodes[i + 1], cfg, now_ms):
            boundaries.append(i)

    # Veto 3 — comms loss is maintenance, never a vote. Single offline => ALERT.
    if not boundaries:
        if offline and all(n.state in ("NORMAL", "RECOVERED") for n in active):
            names = ",".join(n.node_id for n in offline)
            return Decision("ALERT", f"node_offline:{names}", None, None, 0.7)
        if any(n.state in ASSERTED for n in active):
            # Asserted node(s) but no clean boundary (e.g. expired votes, mid-line single)
            return Decision("ALERT", "single_node_no_quorum", None, None, 0.55)
        return Decision("NONE", "no_fault", None, None, 0.9)

    # Veto 2 (upstream sanity) is structural: boundary requires healthy upstream.
    # Ambiguity => ALERT, never ISOLATE.
    if len(boundaries) > 1:
        return Decision("ALERT", "multiple_boundaries_ambiguous", None, None, 0.5)

    i = boundaries[0]
    upstream, downstream = nodes[i], nodes[i + 1]
    # Quorum: asserted downstream neighbours within window (Veto 3 already excludes OFFLINE).
    voters = [n for n in nodes[i + 1:] if _is_asserted(n, cfg, now_ms)]
    if len(voters) < cfg.quorum_required:
        return Decision("ALERT", "quorum_not_met", None, None, 0.55)

    first_ts = min(n.ts for n in voters)
    latency = now_ms - first_ts
    # Confidence falls near quorum minimum and near window edge.
    conf = 0.95
    if len(voters) <= cfg.quorum_required:
        conf -= 0.15
    newest_age = now_ms - max(n.ts for n in voters)
    if newest_age > cfg.quorum_window_ms * 0.8:
        conf -= 0.15
    conf = max(0.0, min(1.0, conf))
    return Decision("ISOLATE", "quorum_confirmed",
                    (upstream.node_id, downstream.node_id), latency, conf)
