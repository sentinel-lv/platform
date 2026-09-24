"""Async queue the backend consumes (backend/app/ingest.py).

Same interface the future MQTT ingest path implements: put(telemetry),
subscribe() -> async generator. Simulator simply not started in production.
"""
import asyncio

class Bus:
    def __init__(self, maxsize=10000):
        self.queue: asyncio.Queue = asyncio.Queue(maxsize=maxsize)

    async def put(self, item):
        try:
            self.queue.put_nowait(item)
        except asyncio.QueueFull:
            _ = self.queue.get_nowait()  # drop oldest, keep live
            self.queue.put_nowait(item)

    async def get(self):
        return await self.queue.get()

    def qsize(self):
        return self.queue.qsize()
