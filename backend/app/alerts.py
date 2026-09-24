"""Alert escalation ladder (backend README Phase 4).

On a firing event: notify the crew channel, wait for ack; unacked after the
timeout -> escalate one rung (crew -> section officer -> control room).
Senders are interfaces: FakeSender (demo/tests), MSG91/Twilio SMS and FCM
push in production (constructed with credentials; see DEPLOY.md). Pure
ladder logic — time is a parameter, so tests are deterministic.
"""
import time

RUNGS = ("crew", "section-officer", "control-room")

class FakeSender:
    def __init__(self):
        self.sent: list[tuple] = []

    def send(self, rung: str, text: str):
        self.sent.append((rung, text))

class Ladder:
    def __init__(self, sender=None, ack_timeout_s: int = 300):
        self.sender = sender or FakeSender()
        self.ack_timeout_s = ack_timeout_s
        self.open: dict[str, dict] = {}  # event_id -> {rung_idx, since, acked}

    def raise_event(self, event_id: str, text: str, now_s: float | None = None):
        now_s = time.time() if now_s is None else now_s
        self.open[event_id] = {"rung_idx": 0, "since": now_s, "acked": False}
        self.sender.send(RUNGS[0], text)

    def ack(self, event_id: str):
        if event_id in self.open:
            self.open[event_id]["acked"] = True

    def poll(self, now_s: float | None = None) -> list[str]:
        """Escalate overdue unacked events one rung. Returns escalated ids."""
        now_s = time.time() if now_s is None else now_s
        out = []
        for eid, st in self.open.items():
            if st["acked"] or st["rung_idx"] >= len(RUNGS) - 1:
                continue
            if now_s - st["since"] >= self.ack_timeout_s:
                st["rung_idx"] += 1
                st["since"] = now_s
                self.sender.send(RUNGS[st["rung_idx"]], f"ESCALATED {eid}")
                out.append(eid)
        return out

ladder = Ladder()
