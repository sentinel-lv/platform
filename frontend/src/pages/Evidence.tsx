import { useEffect, useRef, useState } from 'react';
import Reveal from '../components/Reveal';
import { Link } from '../router';

/**
 * The page that answers the panel's questions without anyone having to
 * remember the answer. Everything here is drawn from PROTOCOL.md §5 and the
 * gateway fail-safe table — it is the argument, not the marketing.
 */

const VETOES = [
  { n: 1, t: 'Global collapse veto', d: 'If every node on the feeder collapses at once, that is a substation-side outage, not a break. Never trip.' },
  { n: 2, t: 'Upstream sanity', d: 'The node immediately upstream of the asserted span must still read NORMAL. If it does not, the span is wrong.' },
  { n: 3, t: 'Comms loss ≠ fault', d: 'A node going OFFLINE is a maintenance alert. It is never counted as a vote toward isolation.' },
  { n: 4, t: 'Rate limit', d: 'No more than one ISOLATE per feeder per 60 s without a manual reset. Prevents oscillation.' },
  { n: 5, t: 'Default ALERT_ONLY', d: 'Auto-isolation is opted into per feeder by the utility, not by us.' },
];

const VECTORS = [
  { f: 'break_mid_feeder', x: 'ISOLATE  N-006 ↔ N-007', ok: false },
  { f: 'break_at_tail', x: 'ISOLATE  N-010 ↔ N-011', ok: false },
  { f: 'substation_outage', x: 'NONE — global collapse veto', ok: true },
  { f: 'rain_burst', x: 'NONE — recovers before sustain', ok: true },
  { f: 'vegetation_contact', x: 'ALERT only, no isolate', ok: true },
  { f: 'single_node_offline', x: 'ALERT only', ok: true },
  { f: 'switching_transient', x: 'NONE — fails sustain', ok: true },
];

const BUDGET = [
  { s: 'Field collapse → node asserts SUSPECT', ms: 250, n: '5 × 50 ms windows' },
  { s: 'SUSPECT broadcast → neighbour votes in', ms: 600, n: 'LoRa gossip round, priority pre-empt' },
  { s: 'Gateway decide()', ms: 10, n: 'pure function, no I/O' },
  { s: 'Relay / contactor mechanical operation', ms: 400, n: '100–400 ms depending on actuator' },
];
const TOTAL = BUDGET.reduce((a, b) => a + b.ms, 0);

function Section({ n, title, sub, children }: { n: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <Reveal>
        <div className="flex items-baseline gap-3">
          <span className="cc-mono text-2xs font-bold tabular-nums text-accent">{n}</span>
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        </div>
        {sub && <p className="mt-1.5 max-w-[70ch] text-xs leading-relaxed text-ink-2">{sub}</p>}
      </Reveal>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Bars fill from zero the first time the budget comes into view. */
function useGrowOnView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [grown, setGrown] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const el = ref.current;
    if (!el || grown) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setGrown(true); io.disconnect(); }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [grown]);
  return [ref, grown] as const;
}

export default function Evidence() {
  const [budgetRef, grown] = useGrowOnView<HTMLDivElement>();
  return (
    <div className="mx-auto w-full max-w-[1000px] px-5 py-10">
      <Link to="/" className="text-xs font-semibold text-ink-3 transition hover:text-ink-2">← Back</Link>
      <h1 className="mt-3 text-display font-extrabold tracking-tight">How it decides</h1>
      <p className="mt-2 max-w-[70ch] text-sm text-ink-2">
        One pure function, <code className="cc-mono text-ink">decide()</code>, written once in Python
        and ported to C. The gateway and the node firmware run the port; the cloud runs the original
        as a shadow that must agree. CI runs both against the same vectors and fails the build if they
        ever disagree.
      </p>

      <Section
        n="01"
        title="The five veto rules"
        sub="The credibility of the project lives here. Each one is a reason the system refuses to act, and each is individually tested."
      >
        <ol className="overflow-hidden rounded-panel border border-line">
          {VETOES.map((v, i) => (
            <Reveal key={v.n} delay={i * 70}>
              <li className={`flex gap-3 bg-surface-1 px-4 py-3 ${i ? 'border-t border-line-soft' : ''}`}>
                <span className="cc-mono shrink-0 text-sm font-bold text-accent">{v.n}</span>
                <div>
                  <div className="text-sm font-semibold">{v.t}</div>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-2">{v.d}</p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </Section>

      <Section
        n="02"
        title="Shared test vectors"
        sub="Seven fixtures every implementation must pass. Five of the seven assert that nothing happens — that is the interesting half."
      >
        <Reveal><div className="overflow-hidden rounded-panel border border-line">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface-2 text-left text-2xs uppercase tracking-[.1em] text-ink-3">
                <th className="px-4 py-2 font-semibold">Vector</th>
                <th className="px-4 py-2 font-semibold">Expected decide() output</th>
              </tr>
            </thead>
            <tbody>
              {VECTORS.map((v, i) => (
                <tr key={v.f} className={`bg-surface-1 ${i ? 'border-t border-line-soft' : ''}`}>
                  <td className="cc-mono px-4 py-2 text-ink-2">{v.f}.json</td>
                  <td className={`cc-mono px-4 py-2 font-semibold ${v.ok ? 'text-accent' : 'text-critical'}`}>{v.x}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></Reveal>
      </Section>

      <Section
        n="03"
        title="Latency budget"
        sub="Measured, not asserted. latency_ms on every event is the real figure from the earliest SUSPECT to command issue; the actuator's own confirmation is logged separately."
      >
        <div ref={budgetRef} className="overflow-hidden rounded-panel border border-line">
          {BUDGET.map((b, i) => (
            <div key={b.s} className={`flex items-center gap-3 bg-surface-1 px-4 py-2.5 ${i ? 'border-t border-line-soft' : ''}`}>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium">{b.s}</div>
                <div className="text-2xs text-ink-3">{b.n}</div>
              </div>
              <div className="h-1.5 w-32 shrink-0 overflow-hidden rounded-full bg-accent-dim">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)]"
                  style={{ width: grown ? `${(b.ms / 2000) * 100}%` : '0%', transitionDelay: `${i * 130}ms` }}
                />
              </div>
              <span className="cc-mono w-16 shrink-0 text-right text-xs font-semibold tabular-nums">{b.ms} ms</span>
            </div>
          ))}
          <div className="flex items-center gap-3 border-t border-line bg-surface-2 px-4 py-2.5">
            <div className="flex-1 text-xs font-bold">Total</div>
            <span className="cc-mono text-xs font-bold tabular-nums text-good">
              ≈ {(TOTAL / 1000).toFixed(1)} s · margin to the 2 s budget
            </span>
          </div>
        </div>
      </Section>

      <Section
        n="04"
        title="Where the decision runs"
        sub="The single most important architectural answer, and the one a utility engineer will press on."
      >
        <Reveal><div className="rounded-panel border border-line bg-surface-1 p-4">
          <pre className="cc-scroll cc-mono overflow-x-auto text-2xs leading-relaxed text-ink-2">
{`  nodes ──LoRa mesh gossip──▶ GATEWAY ──drives the relay──▶ span isolated
                               (feeder head)                 < 2 s, local
                                   │
                                   │ LTE / MQTT  (buffered when offline)
                                   ▼
                              backend ──WS──▶ this dashboard
                              observe · alert · audit · configure
                              NEVER in the trip path`}
          </pre>
          <p className="mt-3 text-xs text-ink-2">
            If the radio fails, the gateway raises an alarm and does not trip. If LTE fails, it keeps
            operating and buffers the uplink. If its watchdog resets it, it comes up in LOCKOUT and
            waits for a human to arm it. A physical lockout switch overrides all software, because
            linemen have to be able to trust a mechanical interlock.
          </p>
        </div></Reveal>
      </Section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link to="/console" className="rounded bg-accent px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110">
          Open the live console →
        </Link>
        <Link to="/" className="rounded border border-line bg-surface-2 px-5 py-2.5 text-sm font-semibold text-ink-2 transition hover:border-ink-3 hover:text-ink">
          Back to overview
        </Link>
      </div>
    </div>
  );
}
