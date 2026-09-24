"""Feeder geometry registry (runtime topology).

Loads the OSM baseline from simulator/feeders/kseb_tvm_f12.json once; node
commissioning (POST /nodes) mutates the in-memory order, which is what the
map, the arbiter snapshot and the simulator all follow. Ordering is explicit
(never re-sorted): fault spans are only meaningful in feeder order.
"""
import json
import pathlib
import re

NODE_RE = re.compile(r"^N-\d{3}$")

class GeoRegistry:
    def __init__(self):
        fp = pathlib.Path(__file__).resolve().parents[2] / "simulator" / "feeders" / "kseb_tvm_f12.json"
        try:
            spec = json.loads(fp.read_text())
        except FileNotFoundError:
            spec = {"feeder_id": "KSEB-TVM-F12",
                    "substation": {"lat": 8.5241, "lng": 76.9366}, "nodes": []}
        self.feeder_id = spec["feeder_id"]
        self.substation = spec.get("substation", {})
        self.nodes: list[dict] = [dict(n) for n in spec.get("nodes", [])]

    def order(self) -> list[str]:
        return [n["node_id"] for n in self.nodes]

    def add_node(self, node_id, lat, lng, span_m=42, after=None) -> dict:
        if not NODE_RE.fullmatch(node_id or ""):
            raise ValueError(f"bad node_id {node_id!r} (want N-NNN)")
        if node_id in self.order():
            raise ValueError(f"{node_id} already exists")
        if after is not None and after not in self.order():
            raise ValueError(f"unknown upstream {after!r}")
        node = {"node_id": node_id, "lat": lat, "lng": lng, "span_m": span_m}
        if after is None:
            self.nodes.append(node)
        else:
            self.nodes.insert(self.order().index(after) + 1, node)
        return node

    def remove_node(self, node_id) -> None:
        ids = self.order()
        if node_id not in ids:
            raise ValueError(f"unknown node {node_id!r}")
        del self.nodes[ids.index(node_id)]

    def describe(self, mode="ALERT_ONLY", arbiter=None) -> dict:
        return {"feeder_id": self.feeder_id, "substation": self.substation,
                "nodes": self.nodes,
                "polyline": [[n["lng"], n["lat"]] for n in self.nodes],
                "mode": mode, "arbiter": (arbiter or {} if arbiter is None else arbiter)}

geo = GeoRegistry()
