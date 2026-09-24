"""Feeder orchestration, 2 Hz tick loop. See simulator/README §2/§5."""
import asyncio, json, pathlib, time
from .node import Node
from .bus import Bus

FEEDER_FILE = pathlib.Path(__file__).resolve().parents[1] / "feeders" / "kseb_tvm_f12.json"

class Feeder:
    def __init__(self, feeder_file=FEEDER_FILE, seed=42):
        spec = json.loads(pathlib.Path(feeder_file).read_text())
        self.feeder_id = spec["feeder_id"]
        self.substation = spec.get("substation", {})
        self.nodes: list[Node] = [
            Node(n["node_id"], n.get("lat", 0), n.get("lng", 0), n.get("span_m", 42), seed=seed)
            for n in spec["nodes"]
        ]
        self.by_id = {n.node_id: n for n in self.nodes}
        self.bus = Bus()
        # scenario-mutable overlays
        self.break_from: str | None = None   # nodes strictly downstream collapse
        self.weather = 1.0
        self.veg_node: str | None = None
        self._running = False

    def _break_mask(self, node_id) -> float:
        if self.break_from is None:
            return 1.0
        ids = [n.node_id for n in self.nodes]
        try:
            return 0.02 if ids.index(node_id) >= ids.index(self.break_from) else 1.0
        except ValueError:
            return 1.0

    SLOT_MS = 40  # TDMA slotting (firmware README §5): node packets arrive spread
    # across the 500 ms tick, not all stamped identically. Keeps latency_ms honest.

    async def tick_once(self, now_ms, epoch_s):
        nn = len(self.nodes)
        for k, n in enumerate(self.nodes):
            w = self.weather
            if self.veg_node == n.node_id:
                w *= 0.55  # -45% fluctuating vegetation contact
            ts = now_ms - (nn - 1 - k) * self.SLOT_MS
            item = n.step(ts, weather=w, break_mask=self._break_mask(n.node_id), epoch_s=epoch_s)
            if item is not None:
                await self.bus.put(item)

    async def run(self, hz=2.0):
        """Background tick loop (backend lifespan starts this)."""
        self._running = True
        t0 = time.time()
        while self._running:
            now_ms = int(time.time() * 1000)
            await self.tick_once(now_ms, time.time() - t0)
            await asyncio.sleep(1.0 / hz)

    def stop(self):
        self._running = False

    def apply_decision(self, decision):
        """Closed loop: latch downstream nodes CONFIRMED on ISOLATE (cleared by reset)."""
        if getattr(decision, "action", None) == "ISOLATE" and decision.fault_span:
            _, start = decision.fault_span
            ids = [n.node_id for n in self.nodes]
            for n in self.nodes[ids.index(start):]:
                if n.state == "SUSPECT":
                    n.state = "CONFIRMED"

    def add_node(self, node_id, lat=0.0, lng=0.0, span_m=42, after=None, seed=7):
        """Commission a node at runtime. `after` = upstream neighbour id (None = tail).
        Ordering defines fault spans, so placement is explicit, never sorted."""
        import re
        if not re.fullmatch(r"N-\d{3}", node_id):
            raise ValueError(f"bad node_id {node_id!r} (want N-NNN)")
        if node_id in self.by_id:
            raise ValueError(f"{node_id} already exists")
        if after is not None and after not in self.by_id:
            raise ValueError(f"unknown upstream {after!r}")
        ids = [n.node_id for n in self.nodes]
        pos = len(self.nodes) if after is None else ids.index(after) + 1
        node = Node(node_id, lat, lng, span_m, seed=seed)
        # inherit live baseline so the newcomer does not false-trip on join
        if self.nodes:
            node.baseline = self.nodes[min(pos, len(self.nodes) - 1)].baseline
            node.nominal = self.nodes[min(pos, len(self.nodes) - 1)].nominal
        self.nodes.insert(pos, node)
        self.by_id[node_id] = node
        return node

    def reset(self):
        self.break_from = None
        self.weather = 1.0
        self.veg_node = None
        for n in self.nodes:
            n.state, n.deviation, n.offline = "NORMAL", 0.0, False
            n.baseline, n.efield, n.battery_mv = n.nominal, n.nominal, 3800
            n._sustain, n._recover_ticks = 0, 0
