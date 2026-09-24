"""Per-node signal generation, baseline EWMA, detector FSM.

Signal (simulator/README §3), 2 Hz:
  efield = nominal * diurnal(t) * weather * (1+N(0,0.03)) * break_mask(0.02)
Baseline: EWMA tau ~= 10 min, identical to firmware/baseline.c. Frozen in SUSPECT/CONFIRMED.
Detector: NORMAL ->SUSPECT if dev < -60% x5 consecutive; SUSPECT ->RECOVERED if dev > -20%;
  RECOVERED ->NORMAL after 2 s; quorum->CONFIRMED handled by arbiter layer (feeder/gateway).
"""
import math, random

DT = 0.5            # 2 Hz telemetry tick
DET_DT = 0.05         # 50 ms detector window (matches firmware 5x50 ms budget row)
SUBSTEPS = int(DT / DET_DT)  # 10 detector evaluations per telemetry tick
TAU = 600.0         # ~10 min EWMA
ALPHA = DT / TAU
COLLAPSE = -60.0
RECOVERY = -20.0
SUSTAIN = 5           # consecutive 50 ms windows (~250 ms wall, like firmware)
RECOVER_TICKS = 40    # 2 s at 50 ms

class Node:
    def __init__(self, node_id, lat=0.0, lng=0.0, span_m=42, nominal=4.9, seed=0):
        self.node_id = node_id
        self.lat, self.lng, self.span_m = lat, lng, span_m
        self.nominal = nominal
        self.gain = 1.0  # calibration trim (bridge.set_gain); multiplies output
        self.baseline = nominal
        self.efield = nominal
        self.deviation = 0.0
        self.state = "NORMAL"
        self.seq = 0
        self.battery_mv = 3800
        self.rssi = -90
        self.temp_c = 31.0
        self.suspect_ts = 0
        self._sustain = 0
        self._recover_ticks = 0
        self._rng = random.Random(hash((seed, node_id)) & 0xFFFFFFFF)
        self.offline = False

    def step(self, now_ms, weather=1.0, break_mask=1.0, epoch_s=0.0):
        """Advance one 2 Hz tick. Returns telemetry dict (None if offline)."""
        self.seq += 1
        if self.offline:
            return None
        diurnal = 1.0 + 0.04 * math.sin(2 * math.pi * epoch_s / 86400.0)
        noise = self._rng.gauss(0, 0.03)
        self.efield = self.nominal * self.gain * diurnal * weather * (1 + noise) * break_mask
        # EWMA baseline — frozen in SUSPECT/CONFIRMED (firmware safety rule)
        if self.state in ("NORMAL", "RECOVERED"):
            self.baseline += ALPHA * (self.efield - self.baseline)
        self.deviation = (self.efield - self.baseline) / self.baseline * 100.0
        self._detector(now_ms)
        return self.telemetry("KSEB-TVM-F12", now_ms)

    def _detector(self, now_ms):
        # 10x50 ms sub-steps per telemetry tick: fresh noise each window, same
        # base field. Sustain (~250 ms wall) matches the firmware budget row,
        # so demo wall-clock stays honest against the 2 s budget.
        # suspect_ts uses the sub-step wall time (not the tick end), so the
        # consensus latency_ms measures from actual detection, not telemetry
        # quantization.
        for j in range(SUBSTEPS):
            sub_ts = now_ms - int((SUBSTEPS - 1 - j) * DET_DT * 1000)
            dev = self.deviation + self._rng.gauss(0, 1.0)
            if self.state == "NORMAL":
                if dev < COLLAPSE:
                    self._sustain += 1
                    if self._sustain >= SUSTAIN:
                        self.state = "SUSPECT"
                        self.suspect_ts = sub_ts
                        self._sustain = 0
                        break
                else:
                    self._sustain = 0
            elif self.state == "SUSPECT":
                if dev > RECOVERY:
                    self.state = "RECOVERED"
                    self._recover_ticks = 0
                    break
            elif self.state == "RECOVERED":
                self._recover_ticks += 1
                if self._recover_ticks >= RECOVER_TICKS and dev > RECOVERY:
                    self.state = "NORMAL"
                    break
                elif dev < COLLAPSE:
                    self.state = "SUSPECT"  # fell back
                    self.suspect_ts = sub_ts
                    break
            elif self.state == "CONFIRMED":
                break  # cleared only by reset/RESTORE

    def telemetry(self, feeder_id, now_ms):
        return {
            "node_id": self.node_id, "feeder_id": feeder_id, "ts": now_ms,
            "efield_rms": round(self.efield, 3), "baseline": round(self.baseline, 3),
            "deviation_pct": round(self.deviation, 2), "battery_mv": self.battery_mv,
            "rssi": self.rssi, "temp_c": self.temp_c, "state": self.state, "seq": self.seq,
        }
