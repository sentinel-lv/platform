# Roadmap — what is done, what is next, what is at risk

Written 2026-09-27, after a verification pass that actually ran everything
rather than reading the task lists. Where this disagrees with `PLAN.md §10`,
this file is newer.

Team 173301 (Closed-Circuit) · SIH 2026 · **Student Innovation** · Theme Disaster Management · PS Category Hardware.

---

## 1. Verified state

Everything in this table was executed, not inferred.

| Area | State | Evidence |
|------|-------|----------|
| Contract + vectors | **green** | 7 fixtures in `protocol/vectors/`, now a submodule in `platform` and `edge` |
| `decide()` Python | **green** | `backend/tests` — 37 passed |
| `decide()` C, shared with gateway | **green** | `./firmware/test/run.sh` — C agrees with Python on all 7 |
| Gateway fail-safes | **green** | all 7 rules tested; actuator latch + beacon slots green |
| Detector + EWMA (C) | **green** | host tests mirror `sim/node.py` |
| Simulator | **green** | 12 nodes, 9 scenarios, deterministic under seed |
| Backend service | **green** | event-driven arbiter, WS hello, ring buffers, `/simulate` |
| Node commissioning API | **green** | `POST/PATCH/DELETE /nodes` + audit; 10 tests |
| Frontend M1 | **green** | 4 routes, live cascade at ~120 ms, 0 page errors, dark + light |
| Deploy | **prepped** | `backend/render.yaml`, `.env.example`, `docs/DEPLOY.md` — needs accounts |
| Hardware | **tooling only** | BOM + validators exist; **no bench work done** |

### Two gates that were passing for the wrong reason

Both found and fixed on 2026-09-27; worth knowing about because both looked green.

1. **`backend/tests/test_arbiter.py` ran zero vectors.** It read `docs/vectors/`,
   which stopped existing at the repo split. Now resolves the submodule and
   fails with a message naming it.
2. **`edge/firmware/test/run.sh` generated zero C cases** for the same reason,
   emitted an empty suite, and every assertion passed vacuously. It also linked
   into a hardcoded `/tmp/opencode/` that exists on one machine. Now mktemps a
   build dir and **exits** rather than emitting an empty gate.

**Lesson worth keeping:** a test suite that reports success on an empty input set
is worse than no suite. Every generator in this project should refuse to produce
nothing.

---

## 2. The one red gate, on purpose

`hardware/tests/test_bom.py::test_no_unpriced_rows` fails:

```
unpriced rows — budget unverifiable until filled: ['IP65 enclosure + clamp + jig']
```

The cost figure has been **removed from the landing page** (2026-09-27). It was
being stated as achieved while one line of the BOM had no price in it, which is
exactly the kind of number a utility engineer asks for a source on.

Leave the test red until the row is priced. Until then the honest position is
"BOM target, not yet verified" — and that is what the READMEs now say. Once it
is priced and the gate goes green, the number can go back on the page.

---

## 3. Next, in order

### Before the demo video

- [ ] Price the enclosure row → BOM gate green → the cost figure becomes quotable and can return to the landing page.
- [ ] Deploy: Render (backend) + Vercel (frontend), set `VITE_API_URL` /
      `VITE_WS_URL`, confirm CORS, confirm `/healthz`.
- [ ] Warm-up: hit `/healthz` ten minutes before recording; the console already
      shows a boot animation, but a warm backend records better.
- [ ] Record the 90-second capture **to a local drive**. Venue wifi fails.
- [ ] Open the deployed URL on a phone on mobile data, not campus wifi.
- [ ] Fill the six owner names in `PLAN.md §1` and the Q&A owners in
      `protocol/CONTRIBUTING.md §7`.

### Demo script that the UI is built for

1. Land on `/` — the problem in one sentence, the field animation running.
2. `/evidence` — the five veto rules and the seven vectors. Say the phrase
   "five of the seven assert that nothing happens".
3. `/console` — point at the hero reading `—`, then press **Break mid-feeder**.
   The number lands. The map shows green upstream, amber downstream: *that
   asymmetry is the signature*.
4. Press **Rain burst**. Amber, then green, then a REJECTED line. Point at
   "False alarms rejected".
5. Press **Substation outage**. Nothing trips. Say "global-collapse veto".
6. Click a pin → the inspector. Show the bound device and the label.
7. Say the honesty line out loud: simulated feeder, live consensus engine.

### M2 — hardware (the critical path, not started)

Nothing here can be compressed by working harder; PCB fab + customs is 12–18 days.

- [ ] Order components today, two revisions' worth.
- [ ] Safe bench: isolation transformer, variac, RCD — **photograph it**.
- [ ] First signal at 230 V, 30 cm standoff; confirm collapse on de-energisation.
- [ ] Full characterisation sweep → `hardware/data/*.csv` + plots.
- [ ] Hand the dataset to the simulator owner to re-fit the noise model. The
      current collapse profile is a guess, and tuning thresholds on a guess is
      how the first bench test embarrasses you.

### M3/M4 — firmware + gateway on real radio

- [ ] Three dev boards gossiping; quorum under 1.5 s.
- [ ] Pull one board's power → the others report OFFLINE and do not count it.
- [ ] Collapse all three → no assertion (global-collapse veto on real hardware).
- [ ] Relay clicks from a real quorum, latency measured end to end.
- [ ] Power-cycle the gateway → comes up in LOCKOUT.

### Post-submission frontend

- [ ] Crew PWA: alert → accept → navigate → mark restored.
- [ ] Historical analytics: fault frequency by span, battery degradation trend.
- [ ] Replay mode: feed recorded bench telemetry through the same pipeline.
- [ ] A `?feeder_id=` route so more than one feeder is reachable.

---

## 4. Risks

| Risk | Mitigation |
|------|------------|
| PCB lead time sinks M2–M5 | Order now, two revs; firmware proceeds on dev boards |
| Free-tier cold start mid-demo | Warm `/healthz`; boot animation; local recording as fallback |
| Simulator is cleaner than reality | Re-fit noise from `hardware/data/` before tuning any threshold |
| A judge asks for the BOM number | Price the enclosure row first — do not answer from memory |
| "Has a utility seen this?" | No. Say so. Describe the pilot you would propose. |
| Contract drift across four repos | The vector gate is real again — keep it in CI, cross-track reviewer |

---

## 5. Standing decisions

These were deliberate and should not be quietly reversed.

- **The cloud never trips.** `/simulate` and the arbiter output are display and
  audit. In production the same `decide()` runs on the gateway.
- **`node_id` is immutable.** Ordering along the feeder is what makes a fault
  span computable. Operators get a `label`; the ID is the contract.
- **Colour is never the only channel.** CONFIRMED-red vs NORMAL-green measures
  deltaE 4.1 under deutan simulation — indistinguishable. Every state carries a
  glyph and a label; spans carry a dash pattern.
- **`ALERT_ONLY` is the default,** so `isolated` is false even on a perfect
  detection. UI keys off the verdict, never off `isolated`.
- **No auto-reclose in v1.** Reclosing onto a downed conductor is how people die.
