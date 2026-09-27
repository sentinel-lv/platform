# PLAN.md — Closed-Circuit build plan (SIH 2026)

Team VITBSIH26-388 · Open Innovation / Disaster Management · self-proposed problem · Mentor Dr. Abha Trivedi.
Derived strictly from `README.pdf` (overview), `README (1)–(8).pdf` (six tracks), `PROTOCOL.pdf` (contract), `CONTRIBUTING.pdf` (process). `docs/PROTOCOL.md` is frozen (M0); everything else follows it.

## 0. Targets (README §2)

| Metric | Target | Proved by |
|--------|--------|-----------|
| Detection → isolation | < 2 s | `latency_ms` on every event + gateway relay-click measurement (M4) |
| False trip rate | 0 in bench set | 7 vectors green in Python + C, rain/vegetation/outage never ISOLATE |
| Node BOM | target only, **unverified** | `hardware/BOM.csv` — enclosure row unpriced, so no figure is quotable yet |
| Node avg current | < 5 mA | metered with firmware running; solar + LiFePO4, 5-day monsoon autonomy |
| Inter-node range | ≥ 300 m LOS | field measurement, SF9/BW125/CR4-5 start, adjust for airtime |

Architecture: probe → node → LoRa mesh quorum → **gateway decides + drives relay locally** → LTE/MQTT → backend → WS → frontend. Cloud never trips.

## 1. Ownership (README §5 — fill TBD now)

| Track | Repo / dir | Owner | Critical note |
|-------|-----------|-------|---------------|
| Hardware / AFE | `hardware` | **Md Danish** | STARTS TODAY — PCB 12–18 d is the critical path; order 2 revs of parts |
| Firmware / mesh | `edge/firmware/` | **Abhishek** | Dev boards (STM32L4 Nucleo or ESP32-S3 + SX1262) until PCB arrives |
| Gateway / actuation | `edge/gateway/` | **Arnav Sharma** | Safety-critical trip path |
| Simulator | `platform/simulator/` | **Shaik Suhail** | Unblocks backend+frontend day 1 |
| Backend | `platform/backend/` | **Pranav Shukla** | Owns `decide()` reused by gateway |
| Frontend | `platform/frontend/` | **Pranav Shukla** | Owns the demo (judges only see this) |

Lead **Pranav Shukla** — full stack (backend + frontend), integration, PPT, demo
script, PROTOCOL ownership. Mentor: Dr. Abha Trivedi, SCAI, VIT Bhopal University.

One consequence of the lead also owning both software tracks: CONTRIBUTING's
"reviewer must be from a different track" rule needs care here. Backend and
frontend PRs should go to an edge- or hardware-track owner for review, precisely
because that is the pairing most likely to catch contract drift.

## 2. Milestones M0–M6 (README §6)

| # | Milestone | Definition of done | Depends on |
|---|-----------|--------------------|------------|
| M0 | Contract frozen | `docs/PROTOCOL.md` + `docs/vectors/` merged, all 6 have read it | — (do TODAY) |
| M1 | Demo link live | Public URL + simulated feeder + scenario buttons + cascade animation | simulator day-1 + backend + frontend Ph1–4 |
| M2 | AFE validated | Bench dataset: standoff/temp/humidity/rain + plots + CSV | hardware Ph1–2 |
| M3 | Three-node mesh | 3 dev boards, real LoRa gossip, quorum < 1.5 s, vetoes hold | firmware Ph1–3 + gateway Ph1 |
| M4 | Gateway trips relay | Physical relay from real quorum, measured < 2 s + 5 acceptance tests | gateway Ph1–3 + M3 rig |
| M5 | Scaled field test | Mock pole span, energised ≤50 V conductor, physical cut, video | hardware Ph5 + M4 |
| M6 | Cloud integration | Gateway→MQTT→backend→dashboard E2E | gateway Ph4 + backend Ph4 |

M1 → PPT. M5 → wins finale.

## 3. Execution order (critical-path first)

```
TODAY: M0 (freeze PROTOCOL + vectors skeleton) + hardware orders + simulator day-1 + frontend scaffold+deploy + firmware blink+radio
  ├─ demo lane (M1): simulator → backend arbiter+service → frontend map+live+cascade  [days 1–9]
  ├─ sensing lane (M2): hardware breadboard → characterisation → re-fit simulator noise [days 1–6]
  └─ actuation lane (M3→M4): firmware detection+mesh ↔ gateway receive+decide+actuate [days 1–10]
THEN: M5 scaled rig + video → M6 MQTT/TLS/uplink + hardening → panel rehearsal + handouts
```

- Simulator is the day-1 unblocker: 12 nodes@2 Hz + `break_mid_feeder` + `reset` lets backend test `decide()` and frontend build against mocks on day 1.
- Hardware cannot slip: fab+customs 12–18 d; order before design feels finished; firmware proceeds on dev boards in parallel.
- Wed integration check (does `main` still demo E2E?) is mandatory — catches contract drift early.

## 4. Per-track phase plan (from each track README)

### Simulator (§6) → M1 + vectors
- [ ] D1: 12 nodes, 2 Hz, noise → queue; `break_mid_feeder` + `reset`
- [ ] D2: diurnal ±4% + EWMA parity with firmware; remaining 7 scenarios
- [ ] D3: composable scenarios + `POST /simulate` wiring
- [ ] D4: export all scenarios → `docs/vectors/*.json` (deterministic seed)
- [ ] Later: replay mode from `hardware/data/` bench recordings

### Backend (§6) → M1, owns decide()
- [ ] D1: `models.py` exact + vectors committed + `test_arbiter.py` red
- [ ] D2–3: `decide()` green + 5 vetoes + all-SUSPECT-never-ISOLATE property test
- [ ] D3–5: ring buffers + event-driven arbiter + `events.py` trail/latency + `ws.py` queues + REST + CORS + deploy `/healthz` green
- [ ] Post-M1: MQTT-same-interface, TimescaleDB, mTLS, SMS/push, auth, OTA, IEC-104 stub, audit log

### Frontend (§5) → M1, owns demo
- [ ] D1 skeleton: Vite+TS+Tailwind + Vercel URL + `types/protocol.ts` exact + mocks + StatusBar
- [ ] D2–3 map: MapLibre OSM + `GET /feeders` + state colours + click→NodeCard + fit-bounds
- [ ] D4–5 live: `/stream` backoff + Zustand 60-sample sparklines + NodeCard (spark+baseline+battery+RSSI+badge) + client OFFLINE
- [ ] D6–8 mechanics: ScenarioPanel→simulate + CascadeOverlay (real `latency_ms`) + RECOVERED visuals + timeline+trail + CrewAlertMock
- [ ] D9 polish: loading/error, latency badges, simulated-label, mobile, Lighthouse
- [ ] V2 after submit: PWA, commissioning, tuning UI, analytics, audit view

### Hardware (§7) → M2 (critical path)
- [ ] Ph1 breadboard TODAY: parts+extras, buffer+BP+gain, TXF+variac+RCD photos, first 230 V@30 cm signal + collapse check
- [ ] Ph2 →M2: full sweep (§4 table) → `data/*.csv` + plots + rain quantified + hand to simulator
- [ ] Ph3 PCB: KiCad + 2nd-person review + DRC + JLCPCB order + 2 revs parts
- [ ] Ph4 bring-up: rails, quiescent, AFE match, solar day-cycle, <5 mA metered
- [ ] Ph5 mechanical: IP65 + clamp 90–140 mm + jig + ≤50 V scaled rig

### Firmware (§7) → M3
- [ ] Ph1 now: PlatformIO blink/UART, SX1262 2-board pkt, ADC DMA 1 kHz 10-cycle RMS vs sig-gen
- [ ] Ph2 detection: EWMA parity, FSM 4 transitions, `arbiter.c` all-vectors green + CI parity gate
- [ ] Ph3 mesh: TDMA slots + beacon sync, gossip+votes+expiry, pre-empt path, AES-CCM, 3-board test →M3
- [ ] Ph4 reliability: watchdog/brownout, store-forward, seq-reboot, power profile, OTA optional-cut

### Gateway (§6) → M4
- [ ] Ph1 receive: concentrator + 3-board RX + auth-drop-count + beacon/slotting
- [ ] Ph2 decide: shared `arbiter.c` HIL + per-feeder config + latency instrumentation
- [ ] Ph3 actuate →M4: opto-relay+LEDs + 7 fail-safes tested + lockout switch + measured <2 s
- [ ] Ph4 uplink: MQTT/TLS + 1 h store-forward + signed config + heartbeat
- [ ] Ph5 field: ride-through, DIN enclosure, LOCKOUT cold-start, 24 h soak

## 5. Test-vector matrix (PROTOCOL §7 — enforced in CI)

| Vector | Input | Expected |
|--------|-------|----------|
| `break_mid_feeder.json` | N-007+downstream collapse, N-006 NORMAL | ISOLATE N-006↔N-007 |
| `break_at_tail.json` | tail collapse | ISOLATE tail span |
| `substation_outage.json` | all collapse at once | NONE (global veto) |
| `rain_burst.json` | all −25% 8 s then recover | NONE (pre-sustain recovery) |
| `vegetation_contact.json` | one node −45% fluctuating | ALERT only |
| `single_node_offline.json` | one silent | ALERT only |
| `switching_transient.json` | 300 ms spike | NONE |

Acceptance gates: M1 (break <2000 ms + correct span; 4 non-trip scenarios silent; WS resilient; hello <5 s; URL <3 s; rain visibly recovers) · M2 (standoff ×3 within 5%, collapse <5% in 200 ms, rain <60% threshold, drift < EWMA) · M3 (quorum <1.5 s, OFFLINE≠vote, all-collapse veto, C==Python) · M4 (relay <2 s, antenna-out→alarm-no-trip, reboot→LOCKOUT, 10-s double-break rate-limited, 1-h offline replay in order).

## 6. Latency budget (gateway §5 — measure, don't assert)

Field→SUSPECT 250 ms (5 windows) + gossip 600 ms + decide <10 ms + relay 100–400 ms ≈ 1.3 s (margin to 2 s). `latency_ms` = first SUSPECT → command; actuator confirmation logged separately.

## 7. Risks + mitigations

| Risk | Mitigation |
|------|------------|
| PCB 12–18 d slips everything | Order TODAY + 2 revs parts; firmware on dev boards; breadboard≠PCB thresholds |
| Contract drift (4 people × 1 day) | M0 freeze + cross-track reviewer + CI vector gate + no invented fields |
| Free-tier cold start mid-demo | Warm `/healthz` 10 min before; frontend "connecting…" + wake-ping; 90-s local recording fallback |
| Fantasy-clean simulator → real bench fails | Re-fit noise/collapse from `hardware/data/`; never step-to-zero |
| Cloud accidentally becomes trip path | Gateway validates/rate-limits/refuses cloud requests; keep `/simulate` env-flagged |
| Power dies on isolation / coil flyback / ground loops | Ride-through cap/battery; flyback diode; opto-isolate every LV↔SBC crossing |
| 50 Hz drift / humidity / crosstalk | Zero-cross tracking; IPA+guard+coat; characterise 3-phase now |

## 8. Demo-day checklist + panel Q&A (CONTRIBUTING §6–7)

Checklist: hotspot test · warmed backend · 90-s recording local · rig + spares · field video local · plots + BOM handouts · laptop/HDMI/ext.
Rehearse owners: rain→data+button · radio-fail→Rule 1 no-trip · smart-meter→cost/no-outage/unmetered · liability→ALERT_ONLY opt-in · cost→BOM.csv · utility-validation→honest pilot (never overclaim — trap question; no DISCOM has reviewed this).

## 9. Immediate next actions (do in this order)

1. Assign TBD owners (§1) + Pranav confirms PROTOCOL freeze → M0.
2. Hardware: place component orders + bench safety photos (TODAY).
3. Simulator: D1 crude feed + `break_mid_feeder`/`reset` → unblock backend/frontend.
4. Backend: `models.py` + red tests (D1). Frontend: scaffold + Vercel URL (D1). Firmware: blink + 2-board LoRa (D1–2).
5. Wed: first E2E integration check on `main`.

## 10. Build status (verified this session — reproduce via `./firmware/test/run.sh`)

| Area | State | Proof |
|------|-------|-------|
| Contract + vectors | DONE | `docs/PROTOCOL.md` frozen; 7 fixtures in `docs/vectors/` |
| `decide()` Python | DONE | `backend/app/arbiter.py`, all vectors + property test green |
| `decide()` C + gateway share | DONE | `firmware/src/arbiter.c` symlinked at `gateway/src/arbiter.c`; C runner green, `-Werror` clean |
| Detector + EWMA (C) | DONE | `firmware/src/baseline.c`, `detector.c`; 14 host tests mirror `sim/node.py` |
| Simulator day-1+ | DONE | 12-node feeder, 9 scenarios, 50 ms sub-steps, TDMA stagger; scenario tests green |
| Backend service | DONE | event-driven arbiter, dedup + 3× span debounce, mode/rate gates, rejection lines, WS hello, `/simulate` preempt; live-verified on :8128–:8130 |
| Frontend M1 | DONE | 12 cards/pins, 8 scenarios, cascade with real `latency_ms` (~120 ms), timeline, crew mock; Playwright headless: 0 page errors, desktop + mobile shots |
| Offline reaper | DONE | 5 s `reap_once()`: silent node → `NODE_OFFLINE` ALERT (no trip); whole-silent feeder → single `all_nodes_stale` (py + C); recovery is silent, never a rejection |
| Post-M1 backend | DONE (seams) | `PATCH config` + audit + token gate + device registry + MQTT parse + file archive + Timescale SQL + alert ladder + IEC-104 stub + OTA registry; live broker/DB/creds need prod |
| Frontend v2 (tuning+audit) | DONE | ThresholdTuner + AuditLog + PWA manifest (service worker deliberately omitted — live WS must never serve stale); tuning proven live end-to-end |
| Map depth | DONE | per-segment span colours, 5 s pin-staleness ticker, `/history` sparkline backfill, split `map`/`charts` chunks, GH parity workflow (budget job informational) |
| Dynamic topology | DONE | `POST/DELETE /nodes` → geo registry + sim + arbiter order in lockstep (`bridge.py`); map click-to-add with upstream select; break-across-new-node names the new span; verified headless (13th pin live) |
| Gateway safety | DONE (logic) | `safety.c` 7 rules + stability + actuator latch + slots, all C tests green; `uplink.py` 1 h buffer, pytest green |
| Deploy | PREPPED | `backend/render.yaml`, `backend/.env.example`, `docs/DEPLOY.md`; needs accounts + click-through |
| Hardware | TOOLING ONLY | `validate_data.py`, BOM tests (**RED: enclosure unpriced, known ₹1,755/₹1,800**), re-fit procedure; bench/PCB/rig need hands |
| **Full gate** | **RED on BOM** | `test_no_unpriced_rows` fails until the enclosure row is priced — deliberate. Software gate (everything else) is green. |

Live dev ports used this session: backend `:8128`–`:8140` (`:8000` was occupied at the time), frontend `:5173`–`:5181`. Canonical ports are backend `:8015` + frontend `:5173` everywhere (READMEs, .env.examples, client fallbacks); match `frontend/.env` to whichever backend runs.

## 11. Hardening round (this session)

- Offline reaper + `all_nodes_stale` veto (py + C) — a silent node raises `NODE_OFFLINE`; whole-silent feeder raises one alarm; recovery is silent.
- Archive hook (`ARCHIVE_DIR`-gated) feeding the replay story; full 9-scenario arbiter coverage incl. a real 30-min drift run (seq 3600, worst deviation < 30%, zero false SUSPECT).
- Map depth: per-segment span colours, pin-staleness ticker, `/history` backfill, split chunks, GH parity workflow.
- Full headless regression on a fresh stack: 12 pins → break → cascade 120 ms → reset → rain → REJECTED → add-node → 13 pins → tuner present, 0 page errors (`/tmp/opencode/final.png`).
- Infra note: vite dev servers die if their starter shell is timeout-killed — always start with stdin detached (`< /dev/null`) and verify with a fast curl.
