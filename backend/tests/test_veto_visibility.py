"""A veto must be visible.

The global-collapse veto is the whole point of the substation_outage
scenario, and it used to emit no event at all: _evaluate() only produced
output for reason == "no_fault", so an active refusal was silent. On the
dashboard that looked like a dead button — every pin went SUSPECT and the
timeline showed only the misleading single_node_no_quorum rows from the
ramp-up.
"""
import asyncio

from app import ingest
from app.arbiter import Decision
from app.events import build_event

FEEDER = "SLV-TVM-F12"


def _veto_decision():
    return Decision("NONE", "global_collapse_veto", None, None, 0.95)


def test_veto_is_a_rejection_type_not_a_break():
    """It stays inside the frozen type enum — no contract change."""
    ev = build_event(FEEDER, _veto_decision(), [], 1_000)
    assert ev["type"] == "FALSE_POSITIVE_REJECTED"
    assert ev["isolated"] is False
    assert ev["reason"] == "global_collapse_veto"


def _run_outage(monkeypatch):
    """Drive _evaluate with every node collapsed, as a substation outage does."""
    from app.arbiter import NodeState

    snap = [NodeState(f"N-{i:03d}", "SUSPECT", -98.0, 1_000) for i in range(1, 13)]

    class FakeState:
        latest: dict = {}
        def snapshot(self, _now):
            return snap

    sent = []

    async def fake_broadcast(kind, payload):
        sent.append((kind, payload))

    monkeypatch.setattr(ingest.hub, "broadcast", fake_broadcast)
    ingest.event_log.clear()
    ingest._last_key.pop(FEEDER, None)

    asyncio.run(ingest._evaluate(FakeState(), FEEDER, 2_000, suppress_rejection=False))
    return sent


def test_global_collapse_veto_emits_exactly_one_event(monkeypatch):
    sent = _run_outage(monkeypatch)
    events = [p for k, p in sent if k == "event"]
    assert len(events) == 1, "the veto must produce a visible timeline row"
    assert events[0]["reason"] == "global_collapse_veto"
    assert events[0]["isolated"] is False


def test_held_outage_does_not_spam_the_timeline(monkeypatch):
    """Telemetry arrives at 2 Hz; a held outage must stay one row."""
    from app.arbiter import NodeState

    snap = [NodeState(f"N-{i:03d}", "SUSPECT", -98.0, 1_000) for i in range(1, 13)]

    class FakeState:
        latest: dict = {}
        def snapshot(self, _now):
            return snap

    sent = []

    async def fake_broadcast(kind, payload):
        sent.append((kind, payload))

    monkeypatch.setattr(ingest.hub, "broadcast", fake_broadcast)
    ingest.event_log.clear()
    ingest._last_key.pop(FEEDER, None)

    async def drive():
        for t in range(2_000, 6_000, 500):
            await ingest._evaluate(FakeState(), FEEDER, t, suppress_rejection=False)

    asyncio.run(drive())
    assert len([p for k, p in sent if k == "event"]) == 1
