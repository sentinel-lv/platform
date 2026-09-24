"""FastAPI app, lifespan, CORS, router mounting (backend README §2-3).

Simulator starts as a lifespan background task: ONE command brings up the
whole demo backend (no extra terminal/broker locally).
"""
import asyncio, json
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

feeder = None  # simulator Feeder, set in lifespan (imported by routes/simulate.py)

@asynccontextmanager
async def lifespan(app: FastAPI):
    global feeder
    import sys, pathlib
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "simulator"))
    from sim.feeder import Feeder
    from .ingest import consume_bus
    from .bridge import attach_sim
    feeder = Feeder()
    attach_sim(feeder)
    from .ingest import reap_once, states, _evaluate

    async def reaper():
        while True:
            await asyncio.sleep(5)
            try:
                await reap_once(int(__import__("time").time() * 1000))
            except Exception:
                pass  # reaper must never die

    async def confirmer():
        """Re-evaluate asserted feeders 4x/s so a steady minimum-quorum fault
        (2 voters, 2 transitions, then silence) still reaches debounce and
        fires. Latency is unaffected: it measures from the first SUSPECT."""
        import time as _t
        while True:
            await asyncio.sleep(0.25)
            try:
                now = int(_t.time() * 1000)
                for fid, st in list(states.items()):
                    snap = st.snapshot(now)
                    if any(n.state in ("SUSPECT", "CONFIRMED") for n in snap):
                        await _evaluate(st, fid, now, suppress_rejection=False)
            except Exception:
                pass  # confirmer must never die

    tasks = [asyncio.create_task(feeder.run()),
             asyncio.create_task(consume_bus(feeder.bus, feeder.feeder_id)),
             asyncio.create_task(reaper()),
             asyncio.create_task(confirmer())]
    yield
    feeder.stop()
    for t in tasks:
        t.cancel()

app = FastAPI(title="Closed-Circuit backend", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[__import__("os").getenv("FRONTEND_ORIGIN", "*")],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/healthz")
def healthz():
    return {"ok": True}

from .routes import feeders, nodes, events, simulate, devices, scada, ota  # noqa: E402
app.include_router(feeders.router)
app.include_router(nodes.router)
app.include_router(events.router)
app.include_router(simulate.router)
app.include_router(devices.router)
app.include_router(scada.router)
app.include_router(ota.router)

@app.websocket("/stream")
async def stream(ws: WebSocket, feeder_id: str = "KSEB-TVM-F12"):
    from .ws import hub
    from .ingest import get_state
    await ws.accept()
    q = hub.connect()
    try:
        st = get_state(feeder_id)
        await ws.send_json({"kind": "hello", "payload": {
            "feeder_id": feeder_id, "nodes": list(st.latest.values())}})
        while True:
            msg = await q.get()
            await ws.send_json(msg)
    except WebSocketDisconnect:
        pass
    finally:
        hub.disconnect(q)
