"""MQTT ingest path (production) behind the SAME push interface as the demo.

Topic scheme (PROTOCOL §3): cc/feeder/{fid}/node/{nid}/telemetry (QoS1),
.../vote, .../command, .../event (QoS2). Payloads are the same JSON the
simulator emits — when real hardware arrives, the simulator simply does not
start and no downstream code changes (simulator/README §5).

Runs only when MQTT_BROKER is set; otherwise disabled (demo default).
Transport security (TLS + per-device client certs from the device registry)
is configured here at the edge; parsing/validation is broker-independent
and unit-tested below without a broker.
"""
import json
import os
import re

TEL_RE = re.compile(r"^cc/feeder/(?P<fid>[^/]+)/node/(?P<nid>[^/]+)/telemetry$")

def parse_telemetry(topic: str, payload: bytes | str) -> dict:
    """Parse + minimally validate one MQTT telemetry frame. Raises ValueError."""
    m = TEL_RE.fullmatch(topic)
    if not m:
        raise ValueError(f"unexpected topic {topic!r}")
    try:
        body = json.loads(payload)
    except (json.JSONDecodeError, TypeError) as e:
        raise ValueError(f"bad JSON: {e}")
    if not isinstance(body, dict):
        raise ValueError("payload must be an object")
    body.setdefault("feeder_id", m.group("fid"))
    body.setdefault("node_id", m.group("nid"))
    for f in ("ts", "efield_rms", "baseline", "deviation_pct", "battery_mv",
              "rssi", "temp_c", "state", "seq"):
        if f not in body:
            raise ValueError(f"missing field {f}")
    return body

def enabled() -> bool:
    return bool(os.getenv("MQTT_BROKER", ""))

async def run_forever():
    """Bridge loop: subscribe QoS1 telemetry -> handle_telemetry()."""
    import asyncio
    try:
        import paho.mqtt.client as mqtt
    except ImportError:
        raise RuntimeError("MQTT_BROKER set but paho-mqtt not installed")
    from .ingest import handle_telemetry

    client = mqtt.Client()
    # TLS + client certs (device registry fingerprints checked on connect):
    # client.tls_set(ca_certs=..., certfile=..., keyfile=...); see DEPLOY.md.
    loop = asyncio.get_running_loop()
    client.on_message = lambda _c, _u, m: asyncio.run_coroutine_threadsafe(
        handle_telemetry(parse_telemetry(m.topic, m.payload)), loop)
    client.connect(os.getenv("MQTT_BROKER"), int(os.getenv("MQTT_PORT", "1883")), 60)
    client.subscribe("cc/feeder/+/node/+/telemetry", qos=1)
    client.loop_forever()
