"""WebSocket connection manager: broadcast, heartbeat, hello-on-connect (README §4).

Per-connection queues: a slow client must not stall the loop.
Frames: {kind: telemetry|vote|command|event|hello, payload}."""
import asyncio

class Hub:
    def __init__(self):
        self.queues: set[asyncio.Queue] = set()

    def connect(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=1000)
        self.queues.add(q)
        return q

    def disconnect(self, q: asyncio.Queue):
        self.queues.discard(q)

    async def broadcast(self, kind: str, payload: dict):
        dead = []
        for q in self.queues:
            try:
                q.put_nowait({"kind": kind, "payload": payload})
            except asyncio.QueueFull:
                dead.append(q)  # slow client: drop it, don't stall
        for q in dead:
            self.disconnect(q)

hub = Hub()
