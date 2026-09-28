# Demo brief — everything the site does

A complete, verified reference for anyone writing a demo script, a voiceover,
or the PPT. Every figure here was checked against running code on 2026-09-28,
not recalled from the plan.

**Live URLs**
- Frontend: `https://platform-ebon-six.vercel.app`
- Backend: `https://platform-wh3g.onrender.com` (free tier — **sleeps**; warm it)

**The one-line pitch:** a snapped low-voltage conductor draws less than the trip
current, so the fuse stays silent while the wire stays live. Closed-Circuit stops
measuring current and measures the conductor's electric field instead.

**The honesty line, said out loud:** *"Simulated feeder, live consensus engine."*
The twelve nodes are synthetic. The arbiter, the quorum logic, the five veto
rules and every millisecond figure are real code running live.

---

## 1. The five pages

### `#/` — Overview
Long-form argument in eight numbered sections. Roughly 7,400px on a phone.

| § | Section | What it contains |
|---|---------|------------------|
| — | Hero | Headline, the approach in one paragraph, two CTAs, four design targets. Animated backdrop: equipotential field rings breathing around a conductor in cross-section, with the sense plate standing off in the field. |
| 01 | The fault protection cannot see | `DetectionGap` figure — fault severity ranked against the overcurrent pickup threshold. Axis deliberately unlabelled; caption says why. |
| 02 | Measure the field, not the current | Three points: nothing touches the line, works on unmetered spans, collapse is unambiguous. |
| 03 | One node is never enough | `CascadeFilm` — a 9-second CSS/SVG loop of the whole sequence. Plus the four steps: detect locally → ask neighbours → reach quorum → act at the feeder head. |
| 04 | The half that must not trip | Table of all seven scenarios with verdict and reason. |
| 05 | The trip path never touches the internet | `ArchitectureDiagram` (see §4 below) + five failure modes. |
| 06 | Design targets | Four figures, each tagged `measured` or `target`. |
| 07 | Where the build actually is | M0–M5 with honest done / next / planned status. |
| 08 | Demo honesty + CTAs | The simulated-feeder statement in full. |

Sections fade in on scroll. All motion is disabled under `prefers-reduced-motion`.

### `#/evidence` — How it decides
Four numbered sections, for the questions a panel asks.

- **01 The five veto rules** — global collapse veto · upstream sanity · comms loss ≠ fault · rate limit · default ALERT_ONLY. Stagger in on scroll.
- **02 Shared test vectors** — all seven fixtures with expected `decide()` output. Five of the seven assert that *nothing happens*.
- **03 Latency budget** — 250 + 600 + 10 + 400 ms ≈ 1.26 s against a 2 s budget. Bars grow from zero the first time the section scrolls into view.
- **04 Where the decision runs** — the architecture diagram plus the failure-mode paragraph.

### `#/console` — The live operator view
The demo surface. Detailed in §2.

### `#/nodes` — All nodes
Every node's field trace as small multiples, full width. Filter chips count
nodes by state and narrow the grid. Each card: trace with labelled EWMA
baseline and hover readout, E-field, deviation, RSSI, enclosure temperature,
battery meter, sequence number, and seconds since the last frame (turns amber
past the 30 s OFFLINE threshold). Reached from **Expand** in the console.

### `#/team` — Who built it
Six cards that assemble in from different directions, tilt toward the pointer,
and replay on the **⟳ Assemble** button. Monograms are drawn as sentinel nodes
with a breathing field ring in each track's colour.

| Position | Name | Track |
|---|---|---|
| 1 | Pranav Shukla | Lead · Full stack — `pranavmshukla.in` |
| 2 | Md Danish | Hardware — `@danish9661` |
| 3 | Shaik Suhail | Simulator |
| 4 | Abhishek | Firmware (cyan) |
| 5 | Arnav Sharma | Gateway |
| 6 | Shristy | Frontend |

Mentor credited separately: Dr. Abha Trivedi, SCAI, VIT Bhopal University.

---

## 2. The console, element by element

### Command bar (top)
Brand mark (a conductor span with a break in it) — **clicking it returns to the
overview**. Feeder ID, node count, mode. Link state (LIVE / RECONNECTING /
CONNECTING) with a light travelling the bottom rule only while the stream is
actually up. Theme toggle (Light / Auto / Dark). The
"Simulated feeder · live consensus engine" pill.

### KPI strip
| Tile | Meaning |
|---|---|
| **Detection → isolation** | **The hero figure.** Reads `––` before the first event, then the real measured `latency_ms`, metered against the 2000 ms budget. Frame flashes when a new event lands. The digits are never animated toward a fake value. |
| Feeder health | `n/12 normal`, red when anything is in alarm |
| Breaks detected | Quorum-confirmed faults. Tooltip says how many actually drove an isolation. |
| False alarms rejected | The number that proves it is not trigger-happy |
| Trip path | Always reads `GATEWAY` |

### Map
Dark or light OSM raster, darkened in the GPU so the feeder is the brightest
thing on screen. Twelve pole pins on real Thiruvananthapuram geometry, a `GW`
marker at the feeder head, span polylines coloured by the **downstream** node's
state. **Click any pin → the node inspector.** `+ Commission node` arms
click-to-place for adding a node.

### Node inspector (click a pin or a card)
- Live trace with EWMA baseline and hover readout
- E-field, baseline, deviation (coloured against −20% and −60%), battery, RSSI,
  enclosure temperature, sequence, seconds since last frame
- **Placement** — lat/lng/span, plus **Centre on map**
- **Commissioning** — editable pole label, bound device (e.g. `ESP32-S3-0A14`),
  crew notes. Saves via `PATCH /nodes/{id}` and writes an audit row.
- **Decommission** — behind a typed confirmation of the node ID
- States plainly why the node ID is *not* editable: feeder order is what makes a
  fault span computable

### Event timeline
Newest first. Each row: kind chip (`BREAK ✕`, `ISOLATED ✕`, `REJECTED ✓`,
`OFFLINE ○`, `ALERT ▲`), timestamp, span or reason, and the latency badge.
**Expand a row** for the vote trail — an indented tree of who saw what, with
each hop's offset in milliseconds from the first SUSPECT.

### Three sheets (bottom-right buttons)
- **Crew alert** — phone frame with the lineman's push. **Accept** really POSTs
  to `/events/{id}/ack` and lands in the audit log. **Navigate** opens real
  directions to the upstream end of the span. Status line reads
  "ALERT ONLY — treat span as LIVE" when the feeder has not auto-isolated.
- **Tuning** — live `ArbiterConfig` sliders: collapse threshold, sustain
  windows, quorum votes, vote window, recovery threshold, global-collapse veto.
  Saves per feeder.
- **Audit** — who changed what, with actor and timestamp.

### Mobile
Header compacts to two rows, KPI tiles become one scrolling row, and the
scenarios move into a **bottom sheet** behind a fixed "Run a scenario" bar.

---

## 3. The seven scenarios

Grouped in the UI by what they **prove**, which is the argument.

### Must isolate — a real conductor break
| Button | What the simulator does | Verdict |
|---|---|---|
| **Break mid-feeder** | N-007 and everything downstream collapse to ~2%; N-006 stays normal | `ISOLATE` span **N-006 ↔ N-007**, ~**120 ms** |
| **Break at tail** | Last two nodes collapse | `ISOLATE`, span at the tail |

### Must not trip — the credibility set
| Button | What the simulator does | Verdict | Why |
|---|---|---|---|
| **Rain burst** | All nodes −25% for 8 s, then recover | No trip | Recovers before the sustain window closes |
| **Vegetation** | One node −45%, fluctuating, sustained | Alert only | A single node is never a quorum |
| **Substation outage** | Every node → ~1% simultaneously | No trip | **Global-collapse veto** — that is an outage, not a break |
| **Switching transient** | 300 ms spike | No trip | Fails the sustain requirement; never reaches SUSPECT |

### Maintenance
| Button | | |
|---|---|---|
| **Node offline** | One node stops transmitting | Alert, node greys out. Comms loss is **never** a vote toward isolation |

**Reset** — in the Scenarios panel header. Returns every node to NORMAL.
Never disabled, deliberately: it is the escape hatch if a scenario hangs.

> A `low_battery` scenario exists in the simulator but has no button — it is
> reachable only via `POST /simulate/low_battery`.

---

## 4. The architecture answer

> **The isolation decision executes on the gateway at the feeder head, not in
> the cloud.** An LTE round-trip alone can consume the entire 2 s budget, and a
> safety function that depends on a mobile network is not something a utility
> will deploy. The cloud observes, alerts, audits and configures. It never trips.

The diagram on `/` §05 and `/evidence` §04 carries a dashed rule labelled
**TRIP PATH ENDS HERE — BELOW IS OBSERVATION ONLY**. Gateway and isolated span
above it; backend and console below.

**Failure modes, all designed:**
- Radio fails → alarm, **no trip**. A jammed radio must not de-energise a healthy feeder.
- LTE fails → keep operating, buffer the uplink.
- Watchdog resets → come up in **LOCKOUT**, wait for a human to arm it.
- Two breaks in 10 s → rate-limited to one isolation per feeder per 60 s.
- A physical lockout switch overrides every line of software.
- **No auto-reclose, ever, in v1** — reclosing onto a downed conductor is how people die.

---

## 5. Numbers you can defend

| Figure | Status | Backed by |
|---|---|---|
| **< 2 s** detection → isolation | **measured** | Real `latency_ms` on every event; the demo shows ~120 ms |
| **0** false trips in the bench set | **measured** | Seven committed vectors; Python and C held to them in CI |
| **< 5 mA** average node current | *target* | Budgeted for 6 V 1 W panel + 18650 LiFePO4, 5 days monsoon overcast. No board exists to meter. |
| **≥ 300 m** inter-node range | *target* | SF9 / BW 125 kHz / CR 4-5 starting point. Never measured in a field. |
| BOM per node | **not quotable** | The IP65 enclosure row is unpriced, so the test is deliberately red and the figure is off the site |

**Arbiter defaults:** collapse −60% · sustain 5 windows · quorum 2 ·
vote window 1500 ms · recovery −20% · global-collapse veto on.

**Latency budget:** field → SUSPECT 250 ms · gossip 600 ms · `decide()` < 10 ms ·
relay 100–400 ms ≈ **1.26 s**, margin to 2 s.

---

## 6. Suggested run of show (~3 min)

1. **`/`** — the problem in one line. The field animation is already running.
2. **`/evidence`** — the five veto rules, then the vectors table.
   Say: *"five of the seven assert that nothing happens."*
3. **`/console`** — point at the hero reading `––`. Press **Break mid-feeder**.
   The number lands. On the map: green upstream, amber downstream —
   ***that asymmetry is the signature.***
4. Expand the BREAK row → the vote trail, with each hop's offset in ms.
5. **Rain burst** → amber, then green, then a REJECTED line. Point at
   "False alarms rejected".
6. **Substation outage** → nothing trips. Say *"global-collapse veto."*
7. Click a pin → inspector → the bound device and pole label.
8. **Crew alert** → press **Accept** → open **Audit** → the acknowledgement is
   logged with an actor.
9. **`/team`** → press **Assemble**.

**Close with the honesty line.** Stated up front it reads as competent
engineering practice. Discovered by a judge, it loses the room.

---

## 7. Answers to the questions they will ask

| Question | Answer |
|---|---|
| "What stops it tripping in heavy rain?" | Press **Rain burst**. The sustain requirement refuses it before the window closes. |
| "What if the radio fails?" | Fail-safe rule 1 — alarm, no trip. Comms loss is never a vote. |
| "Why not a smart meter?" | No outage to install, no CT, and it covers unmetered spans between customers. |
| "Who is liable if it trips wrongly?" | Default is `ALERT_ONLY`. Auto-isolation is opted into per feeder by the utility, not by us. |
| "What does a node cost?" | **Not yet quotable** — one BOM line is unpriced. Say so. |
| "Has any utility seen this?" | **No.** Self-proposed under Open Innovation. Describe the pilot you would propose. |
| "Where does the decision live?" | On the gateway. The cloud is a shadow that must agree, never a controller. |

---

## 8. Before recording

- [ ] `curl https://platform-wh3g.onrender.com/healthz` **ten minutes before** — the free tier sleeps
- [ ] Fire each scenario once on the live URL (warms the simulator too)
- [ ] Press **Reset** so you open on 12/12 normal with a clean timeline
- [ ] Record to a **local drive** — venue wifi fails
- [ ] Check it on a real phone on **mobile data**
