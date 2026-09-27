import { useEffect, useRef, useState } from 'react';
import { useFeeder, isOffline } from '../store/feederStore';
import { Meter, Stat } from './ui';

/** PROTOCOL §4.3: detection→isolation must stay under 2 s. */
const BUDGET_MS = 2000;

/**
 * The headline number of the whole project, given the one hero slot in the
 * view. It is always on screen — before any event it reads "—", so a judge
 * knows what to watch before they press anything, and the number lands in a
 * place their eye already knows.
 *
 * The value is always the backend's measured latency_ms. Nothing here
 * animates the digits toward a made-up figure; only the frame reacts.
 */
function LatencyHero() {
  const last = useFeeder((s) => s.lastIsolate);
  const ms = last?.latency_ms ?? null;
  const [flash, setFlash] = useState(false);
  const seen = useRef<string | null>(null);

  useEffect(() => {
    if (!last || last.event_id === seen.current) return;
    seen.current = last.event_id;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 1400);
    return () => clearTimeout(t);
  }, [last]);

  const within = ms !== null && ms < BUDGET_MS;
  const tone = ms === null ? 'text-ink-3' : within ? 'text-good' : 'text-critical';

  return (
    <div
      className={`flex min-w-[240px] flex-col justify-center gap-1 border-r border-line px-4 py-2 transition-colors ${
        flash ? 'bg-critical-dim' : ''
      }`}
    >
      <div className="text-2xs font-semibold uppercase tracking-[.12em] text-ink-3">
        Detection <span className="text-ink-3">→</span> isolation
      </div>

      {/* Hero figure: >=48px, same sans as the rest, proportional figures. */}
      <div className={`flex items-baseline gap-2 ${tone} ${flash ? 'cc-rise' : ''}`}>
        <span data-testid="hero-latency" className="text-hero font-extrabold">
          {ms ?? '—'}
        </span>
        <span className="text-sm font-semibold text-ink-3">ms</span>
      </div>

      <Meter
        pct={ms === null ? 0 : (ms / BUDGET_MS) * 100}
        tone={ms === null ? 'good' : within ? 'good' : 'critical'}
        label={`Latency against the ${BUDGET_MS} ms budget`}
        className="mt-0.5"
      />
      <div className="cc-mono text-2xs text-ink-3">
        {ms === null
          ? 'awaiting first event'
          : `${within ? 'within' : 'OVER'} ${BUDGET_MS} ms budget · gateway-measured`}
      </div>
    </div>
  );
}

export default function KpiStrip() {
  const order = useFeeder((s) => s.order);
  const nodes = useFeeder((s) => s.nodes);
  const events = useFeeder((s) => s.events);

  // Re-evaluate staleness on a ticker so OFFLINE appears without new frames.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 5000);
    return () => clearInterval(t);
  }, []);

  const now = Date.now();
  const live = order.filter((id) => {
    const tel = nodes[id]?.tel;
    return tel && !isOffline(tel, now) && tel.state === 'NORMAL';
  }).length;
  const offline = order.filter((id) => isOffline(nodes[id]?.tel, now)).length;
  const alarmed = order.length - live - offline;

  const breaks = events.filter((e) => e.isolated).length;
  const rejected = events.filter((e) => e.type === 'FALSE_POSITIVE_REJECTED').length;

  const healthTone = alarmed > 0 ? 'critical' : offline > 0 ? 'warning' : 'good';

  return (
    <div className="shrink-0 border-b border-line bg-surface-1">
      <div className="flex flex-wrap items-stretch divide-line">
        <LatencyHero />

        <Stat
          label="Feeder health"
          value={`${live}/${order.length || 0}`}
          unit="normal"
          tone={healthTone}
          hint={`${live} normal · ${alarmed} in alarm · ${offline} offline`}
        />
        <Stat
          label="Breaks isolated"
          value={breaks}
          tone={breaks ? 'critical' : 'default'}
          hint="Events where quorum was reached and a span was asserted"
        />
        <Stat
          label="False alarms rejected"
          value={rejected}
          tone={rejected ? 'accent' : 'default'}
          hint="Rain, vegetation and transients that reached SUSPECT and were correctly refused — the number that proves the system is not trigger-happy"
        />
        <Stat
          label="Trip path"
          value="GATEWAY"
          mono={false}
          hint="The isolation decision executes on the gateway at the feeder head, never in the cloud. This dashboard observes and audits."
        />
      </div>
    </div>
  );
}
