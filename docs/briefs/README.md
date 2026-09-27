# Source briefs (archive)

The original planning documents for Closed-Circuit / Sentinel-LV, exactly as
they were written before any code existed. They are kept verbatim as the
historical record of intent — **they are not the live spec**.

| File | What it is |
|------|------------|
| `00-overview.pdf` | Project overview: problem, approach, architecture, repo layout, ownership, milestones M0–M6, demo-honesty rule |
| `01-protocol.pdf` | The shared contract: identifiers, node states, transport, message schemas, `decide()`, veto rules, test vectors |
| `02-contributing.pdf` | Branching, the contract rule, definition of done, shared code, weekly rhythm, demo-day checklist, panel Q&A |
| `03-track-frontend.pdf` | Operator dashboard: stack, structure, layout, task list, M1 acceptance, gotchas |
| `04-track-backend.pdf` | Ingest / arbiter / fan-out: API surface, `decide()` notes, task list, gotchas |
| `05-track-simulator.pdf` | Virtual feeder: feeder model, signal model, the nine scenarios |
| `06-track-firmware.pdf` | Sentinel node: target, signal chain, detector FSM, LoRa mesh, power |
| `07-track-gateway.pdf` | Arbiter / actuation / backhaul: the seven fail-safe rules, latency budget |
| `08-track-hardware.pdf` | Probe / AFE / power / enclosure: safety, sensing principle, characterisation sweep, BOM |

## Which document wins

If any of these disagrees with the code, the precedence is:

1. **`protocol/PROTOCOL.md`** (separate repo, git submodule) — frozen, the contract. Changing it needs team-lead sign-off, a message in the group naming the changed fields, and updated vectors in the same PR.
2. **`PLAN.md`** (this repo) — the live build plan and status.
3. **These PDFs** — intent and rationale. Useful for *why*; stale on *what*.

The briefs still carry `docs/PROTOCOL.md` and `docs/vectors/` paths from the
original single-repo layout. Those live in the `protocol` repo now; the split
into `protocol` / `platform` / `edge` / `hardware` happened after these were written.
