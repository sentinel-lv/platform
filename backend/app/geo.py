"""Feeder geometry registry (runtime topology).

Loads the OSM baseline from simulator/feeders/slv_tvm_f12.json once; node
commissioning (POST /nodes) mutates the in-memory order, which is what the
map, the arbiter snapshot and the simulator all follow. Ordering is explicit
(never re-sorted): fault spans are only meaningful in feeder order.
"""
import json
import pathlib
import re

NODE_RE = re.compile(r"^N-\d{3}$")

# Fields an operator may change after commissioning. `node_id` is deliberately
# NOT among them: PROTOCOL.md defines it as N- plus three digits ascending
# downstream from the feeder head, and that ordering is the only reason a fault
# span is computable at all. Renaming one would silently invalidate every
# recorded span, the shared test vectors and the gateway's own view of the
# feeder. Operators get `label` instead — a human name for the same pole.
MUTABLE = {"label", "device_id", "notes", "lat", "lng", "span_m"}

class GeoRegistry:
    def __init__(self):
        fp = pathlib.Path(__file__).resolve().parents[2] / "simulator" / "feeders" / "slv_tvm_f12.json"
        try:
            spec = json.loads(fp.read_text())
        except FileNotFoundError:
            spec = {"feeder_id": "SLV-TVM-F12",
                    "substation": {"lat": 8.5241, "lng": 76.9366}, "nodes": []}
        self.feeder_id = spec["feeder_id"]
        self.substation = spec.get("substation", {})
        self.nodes: list[dict] = []
        for n in spec.get("nodes", []):
            node = dict(n)
            node.setdefault("label", "")
            node.setdefault("device_id", "")
            node.setdefault("notes", "")
            self.nodes.append(node)

    def order(self) -> list[str]:
        return [n["node_id"] for n in self.nodes]

    def add_node(self, node_id, lat, lng, span_m=42, after=None) -> dict:
        if not NODE_RE.fullmatch(node_id or ""):
            raise ValueError(f"bad node_id {node_id!r} (want N-NNN)")
        if node_id in self.order():
            raise ValueError(f"{node_id} already exists")
        if after is not None and after not in self.order():
            raise ValueError(f"unknown upstream {after!r}")
        node = {"node_id": node_id, "lat": lat, "lng": lng, "span_m": span_m,
                "label": "", "device_id": "", "notes": ""}
        if after is None:
            self.nodes.append(node)
        else:
            self.nodes.insert(self.order().index(after) + 1, node)
        return node

    def get(self, node_id) -> dict:
        for n in self.nodes:
            if n["node_id"] == node_id:
                return n
        raise ValueError(f"unknown node {node_id!r}")

    def update_node(self, node_id, **fields) -> dict:
        """Patch operator-editable metadata. Unknown or immutable keys raise."""
        node = self.get(node_id)
        bad = set(fields) - MUTABLE
        if bad:
            raise ValueError(f"not editable: {sorted(bad)} (allowed: {sorted(MUTABLE)})")
        for k in ("lat", "lng", "span_m"):
            if k in fields and fields[k] is not None:
                fields[k] = float(fields[k])
        if "span_m" in fields and fields["span_m"] is not None and fields["span_m"] <= 0:
            raise ValueError("span_m must be positive")
        for k, v in fields.items():
            if v is not None:
                node[k] = v
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
