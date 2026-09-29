# Closed-Circuit — Detection and automated isolation of broken Low-Voltage AC overhead distribution conductors

**Smart India Hackathon 2026 · Problem Statement SIH26223 · Team ID 173301 · Team Closed-Circuit**
**Student Innovation — Disaster Management · Theme: Disaster Management · PS Category: Hardware**
**Mentor: Dr. Abha Trivedi, SCAI, VIT Bhopal University**

## 1. The problem in one paragraph

When an LV overhead conductor snaps, the live end can stay energised on the ground for minutes to hours. Conventional protection (fuses, overcurrent relays) frequently does not see a broken conductor at all, because a wire lying on dry earth or asphalt draws far less than the trip current. The result is electrocution risk and fire risk with no automatic detection. Existing solutions require either expensive line-mounted CTs or full smart-meter rollout.

## 2. Our approach

A live conductor radiates a 50 Hz electric field. A cheap non-contact capacitive probe mounted on the pole, a few tens of centimetres from the line, can sense that field without any galvanic connection, no CT, no line tap, no outage to install.

When a conductor breaks, the E-field downstream of the break collapses. A single node seeing a collapse is not trustworthy — rain, fog, vegetation contact and switching transients all perturb the field. So nodes gossip over a LoRa mesh and a quorum of neighbours must agree before anything is asserted. Only then does a gateway at the feeder head command isolation.

### Design targets

| Metric | Target |
|--------|--------|
| Detection to isolation | < 2 s |
| False trip rate | 0 in bench characterisation set |
| Node BOM cost | target only — **not yet verified** (see `hardware/BOM.csv`; the enclosure row is unpriced, so the figure is not quotable) |
| Node average current | < 5 mA (solar + LiFePO4, no mains) |
| Inter-node range | ≥ 300 m LoRa, line of sight along span |

## 3. Architecture

```
pole-mounted sentinel nodes
Node 6 ─── Node 7 ─── Node 8
  capacitive E-field probe
  STM32/ESP32 + SX1262
  └──── LoRa mesh gossip ────┘
  local quorum voting
              │
              ▼
     ┌──────────────┐
     │   Gateway    │  ← runs the arbiter. THE TRIP PATH IS LOCAL.
     │ (feeder head)│     relay / load-break switch drive
     └──────┬───────┘
            │ LTE, MQTT
            ▼
     ┌──────────────┐    ┌──────────────┐
     │   Backend    │──WS─▶│  Frontend    │  monitoring, dispatch,
     │   (cloud)    │    │  (dashboard) │  audit, SCADA adapter
     └──────────────┘    └──────────────┘
```

**Non-negotiable architectural rule: the isolation decision executes on the gateway, not in the cloud.** LTE round-trip alone can blow the 2 s budget, and a system whose safety function depends on an internet connection is unsellable to a utility. The cloud observes, alerts, audits and configures. It does not trip.

## 4. Repository layout

```
closed-circuit/
├── README.md                  ← you are here
├── AGENT.md                   ← instructions for AI coding agents
├── PLAN.md                    ← build plan, milestones, task breakdown
├── docs/
│   ├── PROTOCOL.md            ← THE SHARED CONTRACT. Read before writing any code.
│   ├── CONTRIBUTING.md        ← branching, reviews, definition of done
│   └── vectors/               ← shared test fixtures (see PROTOCOL §7)
├── simulator/                 ← virtual feeder, emits protocol-conformant telemetry
├── backend/                   ← FastAPI ingest, arbiter, WebSocket fan-out, REST
├── frontend/                  ← React dashboard, map, fault cascade view
├── gateway/                   ← LoRa concentrator service + relay actuation
├── firmware/                  ← node firmware, sampling, detector, LoRa mesh
└── hardware/                  ← AFE schematic, PCB, enclosure, characterisation data
```

Each directory has its own README with a task list, acceptance criteria and gotchas. Start with `docs/PROTOCOL.md`.

## 5. Ownership

Six people, six tracks. Fill in the names.

| Track | Directory | Owner | Notes |
|-------|-----------|-------|-------|
| Hardware / AFE | `hardware` | **Md Danish** | Starts today. PCB lead time is the critical path. |
| Firmware / mesh | `edge/firmware/` | **Abhishek** | Works on dev boards until PCB arrives. |
| Gateway / actuation | `edge/gateway/` | **Arnav Sharma** | Owns the safety-critical trip path. |
| Simulator | `platform/simulator/` | **Shaik Suhail** | Unblocks backend + frontend on day 1. |
| Backend | `platform/backend/` | **Pranav Shukla** | Owns `decide()`, which the gateway later reuses. |
| Frontend | `platform/frontend/` | **Pranav Shukla** | Owns the demo. |

Pranav (team lead) — integration, PPT, demo script, PROTOCOL ownership.

## 6. Milestones

| # | Milestone | Definition of done |
|---|-----------|--------------------|
| M0 | Contract frozen | `docs/PROTOCOL.md` merged, all six people have read it |
| M1 | Demo link live | Public URL, simulated feeder, scenario buttons, cascade animation |
| M2 | AFE validated | Bench characterisation dataset: standoff, temperature, humidity |
| M3 | Three-node mesh | Real LoRa gossip between 3 dev boards, quorum fires correctly |
| M4 | Gateway trips a relay | Physical relay clicks from a real quorum event, < 2 s measured |
| M5 | Scaled field test | Mock pole span, energised conductor, physical cut, video recorded |
| M6 | Cloud integration | Gateway → MQTT → backend → dashboard, end to end |

M1 is what goes in the PPT. M5 is what wins the finale.

## 7. Demo honesty

The submitted demo runs on a simulated feeder with a live consensus engine. Label it that way in the PPT and say it out loud during the demo. If a judge works out the data is synthetic after you have implied otherwise, you lose the room. Stated upfront, it reads as competent engineering practice — which it is.

## 8. Quick start (demo stack)

```bash
git clone <repo> && cd closed-circuit

# backend + simulator (single command — simulator runs in-process)
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && uvicorn app.main:app --reload

# frontend, separate terminal
cd frontend && npm install && npm run dev
```

Open http://localhost:5173. The simulator runs inside the backend process — no third terminal, no broker needed locally.
