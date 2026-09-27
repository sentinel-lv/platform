# Frontend — operator dashboard

**Owner:** TBD
**Depends on:** `protocol/PROTOCOL.md` (submodule), `backend/` WebSocket endpoint
**Deliverable for M1:** a public URL that a judge can open on their phone and understand in 20 seconds.

You own the demo. Everything else on this project is invisible to the panel; this is not.

## 1. Stack

| Concern | Choice | Why |
|---------|--------|-----|
| Build | Vite + React 18 + TypeScript | fast, zero config fights |
| Map | MapLibre GL JS + free raster tiles | no Mapbox token, no billing surprise mid-demo |
| Charts | Recharts | sparkline + timeline, minimal API |
| State | Zustand | WebSocket stream into one store, no Redux ceremony |
| Styling | Tailwind | consistent under time pressure |
| Deploy | Vercel | push to main, get a URL |

Do not add a component library that needs theming work. There is no time.

## 2. Setup

```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_URL and VITE_WS_URL
npm run dev
```

Or bring the whole demo stack up from `platform/`:

```bash
./start.sh            # backend :8015 + frontend :5173
./start.sh --status   # health check
./start.sh --stop
```

`start.sh` dies if the shell that launched it is killed. For a long-lived
background stack, detach stdin explicitly:

```bash
nohup backend/.venv/bin/python -m uvicorn app.main:app \
      --host 127.0.0.1 --port 8015 --app-dir backend > logs/backend.log 2>&1 < /dev/null &
(cd frontend && nohup npm run dev > ../logs/frontend.log 2>&1 < /dev/null &)
```

`.env.example`:

```
VITE_API_URL=http://localhost:8015
VITE_WS_URL=ws://localhost:8015/stream
```

## 3. Structure

```
frontend/src/
├── api/
│   ├── client.ts            REST wrapper
│   └── socket.ts            WebSocket, auto-reconnect with backoff
├── router.tsx               ~30-line hash router (no dependency; static-host safe)
├── theme/
│   ├── theme.tsx            dark / light / system resolution + cssVar()
│   ├── ThemeContext.tsx     provider; `resolved` drives literal-colour consumers
│   └── state.tsx            ONE definition of how a node state looks
├── store/
│   └── feederStore.ts       nodes, events, connection, selection
├── pages/
│   ├── Landing.tsx          the argument, in eight numbered sections
│   ├── Evidence.tsx         veto rules, vectors, latency budget, trip path
│   ├── Console.tsx          the live operator view
│   └── NodeGrid.tsx         every node's trace as small multiples
├── components/
│   ├── ui.tsx               Panel · Btn · Meter · Stat · Dot · Empty
│   ├── CommandBar.tsx       identity, link state, theme, way back out
│   ├── KpiStrip.tsx         the hero latency + feeder stats
│   ├── FeederMap.tsx        MapLibre, glyph pins, dash-encoded spans
│   ├── NodeInspector.tsx    one node: telemetry, commissioning, decommission
│   ├── NodeCard.tsx         sparkline, meters, state badge
│   ├── NodePanel.tsx        scrollable list + colour key
│   ├── StateKey.tsx         the colour key (compact and full)
│   ├── ScenarioPanel.tsx    demo buttons, grouped by expected outcome
│   ├── CascadeOverlay.tsx   the break banner
│   ├── EventTimeline.tsx    event log with the vote trail
│   ├── CascadeFilm.tsx      landing explainer loop (pure CSS/SVG)
│   ├── FieldBackdrop.tsx    hero backdrop: the field being measured
│   ├── DetectionGap.tsx     why overcurrent protection misses this fault
│   ├── BootScreen.tsx       cold-start animation
│   ├── Reveal.tsx           scroll reveal (single-shot IntersectionObserver)
│   ├── ThemeToggle.tsx      Light / Auto / Dark
│   ├── CrewAlertMock.tsx    the lineman's push
│   ├── ThresholdTuner.tsx   per-feeder ArbiterConfig
│   ├── AuditLog.tsx         who changed what
│   └── AddNodeForm.tsx      click-to-place commissioning
├── types/protocol.ts        generated from PROTOCOL.md — mirror it exactly
├── index.css                design tokens (the one source of colour)
└── App.tsx                  routes + the feeder connection
```

### Routes

| Route | What it is |
|-------|------------|
| `#/` | Overview — the argument, for someone who has 60 seconds |
| `#/evidence` | How it decides — veto rules, vectors, latency budget |
| `#/console` | The live operator view |
| `#/nodes` | Every node's field trace, side by side |

Hash routes on purpose: they work on any static host with no rewrite rules,
so a deploy cannot 404 on a deep link the night before a demo.

### Two rules worth keeping

**Colour is never the only channel.** A CVD check puts CONFIRMED-red against
NORMAL-green at deltaE 4.1 — indistinguishable to a deutan viewer. Every state
therefore renders as colour **+ glyph + label**, and span polylines carry a
dash pattern too. `theme/state.tsx` is the only place that decides this; do not
hard-code a state colour anywhere else.

**Colour lives in `index.css`.** Tailwind only names the custom properties and
SVG resolves them directly, so a theme change repaints charts and badges with
no JavaScript. The one consumer that cannot is MapLibre, which parses colours
itself — it reads literals through `cssVar()` and re-applies them with
`setPaintProperty`.

## 4. Layout

```
┌───────────────────────────────────────────────────┐
│ StatusBar  SLV-TVM-F12 · 12 nodes · ALERT_ONLY · ● LIVE │
├──────────────────────────────────┬────────────────┤
│                                  │ ScenarioPanel  │
│           FeederMap              │ [Break mid-feeder] │
│   ●───●───●───✕───○───○───○      │ [Rain burst]     │
│                                  │ [Vegetation]     │
│   green = normal                 │ [Substation outage] │
│   amber = suspect                │ [Node offline]   │
│   red   = confirmed              │ [Reset]          │
│   grey  = offline                │                │
│                                  ├────────────────┤
│                                  │ NodePanel      │
├──────────────────────────────────┤ N-006 ▁▂▁▂▁ 4.9 100% │
│ EventTimeline                    │ N-007 ▁▂▁▁_ 0.1  98% │
│ 14:22:31 BREAK N-006↔N-007 787ms│ N-008 ▁▂▁▁_ 0.1  97% │
│ 14:19:02 FALSE POSITIVE REJECTED │                │
└──────────────────────────────────┴────────────────┘
```

Mobile: map on top, scenario buttons collapse into a bottom sheet. Judges will open this on a phone — check it.

## 5. Task list

### Phase 1 — skeleton (day 1)

- [ ] Vite + TS + Tailwind scaffold, deployed to Vercel on day one so the URL exists early
- [ ] `types/protocol.ts` transcribed from PROTOCOL.md, exact field names
- [ ] Mock JSON fixtures in `src/mocks/` so you can build before the backend is up
- [ ] StatusBar with a fake connection indicator

### Phase 2 — map (days 2–3)

- [ ] MapLibre with OSM raster tiles, centred on the demo feeder
- [ ] Load feeder polyline + node coordinates from `GET /feeders`
- [x] Pole pins coloured by state (client staleness ticker re-greys on stall), span segments coloured by the downstream node's state via data-driven paint
- [ ] Click a pin → NodeCard opens
- [x] "+ Add node": arm → click map → form (auto ID, upstream select) → `POST /nodes` → live pin + card (Playwright-verified headless)
- [ ] Fit-bounds on load; no manual panning needed to see the whole feeder

### Phase 3 — live data (days 4–5)

- [ ] `socket.ts` connects to `/stream`, reconnects with exponential backoff
- [x] Zustand store ingests telemetry, keeps last 60 samples per node for sparklines (+ `/history` backfill on load so reloads aren't blank)
- [ ] NodeCard: E-field sparkline, baseline as a dashed reference line, battery bar, RSSI, state badge
- [ ] OFFLINE detection client-side too (no telemetry > 30 s) so the UI degrades honestly

### Phase 4 — the demo mechanics (days 6–8)

- [ ] ScenarioPanel buttons → `POST /simulate/{scenario}`, disabled while a scenario runs
- [ ] CascadeOverlay: on a break, animate in sequence — node goes amber, neighbour votes fly along the line, quorum reached, span turns red, big millisecond counter lands on the final `latency_ms`
- [ ] RECOVERED path: rain and vegetation scenarios must visibly go amber and return to green, with a FALSE POSITIVE REJECTED line in the timeline. Give this the same visual weight as a detection.
- [ ] EventTimeline with expandable vote trail per event
- [ ] CrewAlertMock: phone frame, push notification with span, GPS and a map thumbnail

### Phase 5 — polish (day 9)

- [ ] Loading and error states; never a blank screen if the backend is cold-starting
- [ ] Latency badge on every event row
- [ ] "Simulated feeder · live consensus engine" label, always visible, not hidden in a tooltip
- [ ] Responsive check on a real phone
- [ ] Lighthouse pass — a slow dashboard reads as an unfinished dashboard

### Phase 6 — v2, after the demo is submitted

- [ ] Crew PWA: alert → accept → navigate → mark restored
- [ ] Node commissioning flow (QR scan, assign to pole, set GPS)
- [x] Per-feeder threshold tuning UI writing to ArbiterConfig (`ThresholdTuner.tsx` → `PATCH /feeders/{id}/config`; headless-verified: quorum 5 blocks 2-voter tail isolate, defaults restore it)
- [ ] Historical analytics: fault frequency by span, battery degradation trend
- [x] Audit log view with actor and timestamp (`AuditLog.tsx` → `/audit`)

## 6. Acceptance criteria for M1

1. Public URL loads in under 3 s on mobile data.
2. A stranger with no explanation can tell which poles are healthy.
3. Pressing "Break mid-feeder" produces a legible cascade ending in a latency number under 2000 ms.
4. Pressing "Rain burst" produces a visible amber-then-green recovery and a rejection line in the timeline.
5. Backend restart does not require a page refresh — the socket reconnects on its own.

## 7. Gotchas

- **Do not invent fields.** If you need something not in PROTOCOL.md, ask for a contract change; do not add it client-side. A silent divergence here costs a full day at integration.
- Free Render/Railway instances cold-start. Show a "connecting to feeder…" state, and ping the backend from the frontend on page load so it wakes before the judge presses a button.
- **Animation timing is not latency.** The cascade animation may take 3 s to play for legibility; the displayed `latency_ms` must be the real number from the backend. Never animate the counter to a fake value.
- Colour alone is not enough. Add state text to badges — some judges will be colour-blind and the projector will wash out amber.
- Record a 90-second screen capture as a fallback. Venue wifi fails.

### Learned the hard way (this branch)

- **Never set `style.transform` on a MapLibre marker element.** That is the
  property MapLibre uses to *position* it — writing to it collapses every pin
  to the container's top-left corner. Put the visual in an inner element and
  animate that (`scale`, not `transform`).
- **The map needs a `ResizeObserver`.** It initialises inside a flex/grid cell
  that can still be zero-height on first paint, which leaves its viewport size
  stale and its projection wrong.
- **Clear marker refs when the map is destroyed.** StrictMode mounts, tears
  down and remounts; without clearing, the remounted map is handed markers that
  are already detached and the feeder renders as bare line work.
- **MapLibre's canvas is absolutely positioned**, so it paints above any
  statically-positioned sibling that follows it. Panels below the map need
  `relative` or they end up underneath it.
- **`line-dasharray` is not data-driven.** One line layer per state, filtered —
  which is also what lets the dash carry the state when hue cannot.
- **Do not reach for a ready-made dark tile set.** CARTO, Stadia and Mapbox all
  want an API key for theirs now. Plain OSM raster darkened with MapLibre's
  `raster-*` paint properties needs no key and cannot expire mid-demo. Darken
  the raster *layer*, not the canvas — a CSS filter would invert the spans and
  pins too.
- **A feeder defaults to `ALERT_ONLY`,** so `isolated` is false even on a
  perfect detection. Key the banner, the hero figure and the counters off the
  *verdict* (`quorum_confirmed` + a span + a latency), never off `isolated`, or
  the demo shows nothing in the mode it ships in.
- **Restart uvicorn after adding a route.** It runs without `--reload` in the
  background recipe below; a new endpoint 404s until you do.
