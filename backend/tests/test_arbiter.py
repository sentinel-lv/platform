"""Runs every shared vector against decide() (backend README Phase 1-2).

The vectors live in the `protocol` repo, which is a git submodule here — one
frozen contract, one set of fixtures, shared with `edge` so the C port is held
to exactly the same cases. The legacy `docs/vectors/` path is still accepted
because that is where they lived before the repo split.
"""
import json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from app.arbiter import ArbiterConfig, NodeState, decide

_ROOT = pathlib.Path(__file__).resolve().parents[2]
_CANDIDATES = [
    _ROOT / "protocol" / "vectors",       # submodule (current layout)
    _ROOT.parent / "protocol" / "vectors",  # sibling checkout of the org repos
    _ROOT / "docs" / "vectors",           # pre-split layout
]
VECTORS = next((p for p in _CANDIDATES if p.is_dir()), _CANDIDATES[0])

def _load(name):
    return json.loads((VECTORS / name).read_text())

def _run(vec):
    cfg = ArbiterConfig(**vec.get("config", {}))
    nodes = [NodeState(n["node_id"], n["state"], n.get("deviation_pct", 0.0), n.get("ts", 0))
             for n in vec["nodes"]]
    return decide(nodes, vec["now_ms"], cfg)

def test_vectors_exist():
    files = sorted(VECTORS.glob("*.json"))
    assert len(files) >= 7, (
        f"expected >=7 vectors, got {len(files)} in {VECTORS}. "
        "If this is a fresh clone, the protocol submodule is not checked out: "
        "run `git submodule update --init`."
    )

def test_all_vectors():
    for f in sorted(VECTORS.glob("*.json")):
        vec = json.loads(f.read_text())
        exp = vec["expected"]
        d = _run(vec)
        assert d.action == exp["action"], f"{f.name}: action {d.action} != {exp['action']} (reason={d.reason})"
        if exp.get("fault_span") is None:
            assert d.fault_span is None, f"{f.name}: span {d.fault_span} != None"
        else:
            assert tuple(exp["fault_span"]) == tuple(d.fault_span), f"{f.name}: span {d.fault_span} != {exp['fault_span']}"
        if exp.get("reason_contains"):
            assert exp["reason_contains"] in d.reason, f"{f.name}: reason {d.reason} missing {exp['reason_contains']}"

def test_all_suspect_never_isolate():
    """Property test: global collapse must never ISOLATE (veto 1)."""
    cfg = ArbiterConfig()
    nodes = [NodeState(f"N-{i:03d}", "SUSPECT", -95.0, 1000) for i in range(1, 13)]
    d = decide(nodes, 1500, cfg)
    assert d.action == "NONE", d

def test_all_stale_is_single_alarm():
    from app.arbiter import ArbiterConfig, NodeState, decide
    cfg = ArbiterConfig()
    nodes = [NodeState(f"N-{i:03d}", "OFFLINE", 0.0, 1000) for i in range(1, 13)]
    d = decide(nodes, 32000, cfg)
    assert d.action == "ALERT" and d.fault_span is None and "stale" in d.reason, d
