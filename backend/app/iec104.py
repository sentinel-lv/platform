"""IEC 60870-5-104 READ-ONLY STUB (backend README Phase 4).

Utilities will not adopt an island system: this stub shows the mapping the
full adapter will speak — one single-point (M_SP_NA_1) per node state plus
one measurement (M_ME_NC_1) per node field, addressed by stable IOAs.
Served as a REST snapshot (/scada/points) until the TCP-104 codec lands;
control direction is deliberately absent (the gateway owns control).
"""
IOA_BASE_STATUS = 1000  # + node index: 0=NORMAL, 1=SUSPECT/CONFIRMED ACB alarm
IOA_BASE_EFIELD = 2000  # + node index: kV/m float
IOA_BASE_BATTERY = 3000  # + node index: mV

def scada_points(ordered: list[dict]) -> list[dict]:
    """ordered: [{node_id, state, efield_rms, battery_mv}] upstream->downstream."""
    pts = []
    for i, n in enumerate(ordered):
        alarm = n.get("state") in ("SUSPECT", "CONFIRMED")
        pts.append({"ioa": IOA_BASE_STATUS + i, "type": "M_SP_NA_1",
                    "node_id": n["node_id"], "value": alarm})
        pts.append({"ioa": IOA_BASE_EFIELD + i, "type": "M_ME_NC_1",
                    "node_id": n["node_id"], "value": n.get("efield_rms")})
        pts.append({"ioa": IOA_BASE_BATTERY + i, "type": "M_ME_NC_1",
                    "node_id": n["node_id"], "value": n.get("battery_mv")})
    return pts
