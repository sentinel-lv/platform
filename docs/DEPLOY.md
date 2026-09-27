# Deploy — Render (backend) + Vercel (frontend)

Target: a public URL a judge can open on their phone. Both free tiers.

Everything below has one non-obvious prerequisite, so it is first.

---

## 0. The submodule

`platform` contains `protocol` as a git submodule (the frozen contract and the
shared vectors). Both hosts clone submodules for **public** repos over HTTPS,
which is how this one is configured — so it works by default. If a build ever
fails with a missing `protocol/` directory, that is the cause.

The submodule is only needed by the **tests**. Nothing the backend serves at
runtime reads it, so a deploy will not break if it is absent — the test suite
will.

---

## 1. Backend → Render

**New → Blueprint** and point it at the `platform` repo. It picks up
`backend/render.yaml`:

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Build | `pip install -r requirements.txt` |
| Start | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

### Environment

| Key | Value | Why |
|---|---|---|
| `FRONTEND_ORIGIN` | your exact Vercel URL, e.g. `https://closed-circuit.vercel.app` | CORS allowlist. Leave it unset and it defaults to `*`, which works but is sloppy for a public deploy. No trailing slash. |
| `ENABLE_SIMULATE` | `1` | The scenario buttons. **This is a demo build.** A real deployment sets `0` and the `/simulate` routes disappear. |
| `FEEDER_MODE_DEFAULT` | `ALERT_ONLY` | The safe default. Do not ship `AUTO`. |
| `OPERATOR_TOKEN` | *(optional)* | Set it and mutating routes require an `X-Operator-Token` header. Leave unset for the demo — the console has no field for it. |

Confirm with `curl https://<your-backend>.onrender.com/healthz` → `{"ok":true}`.

---

## 2. Frontend → Vercel

**Add New → Project**, import `platform`.

| Setting | Value |
|---|---|
| Root directory | `frontend` |
| Framework preset | Vite (auto-detected) |
| Build / output | from `frontend/vercel.json` |

### Environment

```
VITE_API_URL=https://<your-backend>.onrender.com
VITE_WS_URL=wss://<your-backend>.onrender.com/stream
```

**`wss://`, not `ws://`.** The page is served over HTTPS, and a browser refuses
a plaintext WebSocket from a secure page. It fails silently as a connection
error, so the console will sit on "RECONNECTING" with nothing in the network
tab explaining why. This is the single most likely thing to go wrong.

Both variables are read at **build** time, not runtime — change one and you
must redeploy.

### Routing

No rewrite rules are needed. The app uses hash routes (`#/console`,
`#/evidence`, `#/nodes`, `#/team`), so every URL resolves to `index.html` on
its own and a deep link cannot 404.

---

## 3. Before you record

- [ ] `curl .../healthz` **ten minutes before**. Render's free tier sleeps, and
      a cold start costs the first ~30 s of your video. The console shows a
      boot animation rather than a blank screen, but a warm backend records
      better.
- [ ] Open the Vercel URL on a phone on **mobile data**, not campus wifi.
- [ ] Fire each scenario once on the deployed URL — this also warms the
      simulator.
- [ ] Record the 90-second fallback capture to a **local drive**.

## 4. If something is wrong

| Symptom | Cause |
|---|---|
| Console stuck on RECONNECTING | `VITE_WS_URL` is `ws://` and must be `wss://` |
| Map loads, no pins, no data | `VITE_API_URL` wrong, or CORS — check `FRONTEND_ORIGIN` matches the Vercel origin exactly, no trailing slash |
| Scenario buttons 404 | `ENABLE_SIMULATE` is not `1` |
| First load takes ~30 s | Render free tier cold start — expected, warm it first |
| Everything works, numbers never move | The simulator runs in the backend process; check the Render logs started it |
