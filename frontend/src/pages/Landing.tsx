import CascadeFilm from '../components/CascadeFilm';
import DetectionGap from '../components/DetectionGap';
import FieldBackdrop from '../components/FieldBackdrop';
import Reveal from '../components/Reveal';
import { Link } from '../router';

const warmConsole = () => { void import('./Console'); };

/* ---------------------------------------------------------------- helpers */

function Section({
  n, title, lead, children, className = '',
}: { n: string; title: string; lead?: string; children?: React.ReactNode; className?: string }) {
  return (
    <section className={`border-t border-line py-14 md:py-20 ${className}`}>
      <div className="mx-auto max-w-[1080px] px-5">
        <Reveal>
          <div className="flex items-baseline gap-3">
            <span className="cc-mono text-2xs font-bold tabular-nums text-accent">{n}</span>
            <h2 className="text-display font-extrabold tracking-[-.02em]">{title}</h2>
          </div>
          {lead && <p className="mt-3 max-w-[64ch] text-base leading-relaxed text-ink-2">{lead}</p>}
        </Reveal>
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}

/**
 * Every figure is tagged with whether it has actually been measured yet.
 *
 * Two of these are real numbers out of running code; two are engineering
 * targets for hardware that has not been built. Presenting all four as
 * achieved is how a panel catches you — and saying which is which reads as
 * discipline rather than as a caveat.
 */
const TARGETS = [
  {
    v: '< 2 s', k: 'detection → isolation', proven: true,
    d: 'Measured on every event as latency_ms, from the first SUSPECT to command issue. The live console shows the real figure.',
  },
  {
    v: '0', k: 'false trips in the bench set', proven: true,
    d: 'Rain, vegetation, substation outage and switching transients are committed test vectors. Both the Python and the C arbiter are held to them in CI.',
  },
  {
    v: '< 5 mA', k: 'average node current', proven: false,
    d: 'Budgeted for a 6 V 1 W panel and one 18650 LiFePO4 over five days of monsoon overcast. To be confirmed with a meter once a board exists.',
  },
  {
    v: '≥ 300 m', k: 'inter-node range', proven: false,
    d: 'LoRa SF9 / BW 125 kHz / CR 4-5, line of sight along the span. To be measured in the field, not asserted.',
  },
];

const SCENARIOS = [
  { s: 'Break mid-feeder', o: 'Isolate', trip: true, why: 'N-007 and everything downstream collapse while N-006 stays normal. The asymmetry is the signature.' },
  { s: 'Break at tail', o: 'Isolate', trip: true, why: 'The last two nodes collapse; the span is asserted at the tail.' },
  { s: 'Rain burst', o: 'No trip', trip: false, why: 'Every node drops ~25% for eight seconds and recovers before the sustain window closes.' },
  { s: 'Vegetation contact', o: 'Alert only', trip: false, why: 'One node at −45%, fluctuating. A single node is never a quorum.' },
  { s: 'Substation outage', o: 'No trip', trip: false, why: 'Every node collapses at once. That is an outage, not a break — the global-collapse veto.' },
  { s: 'Switching transient', o: 'No trip', trip: false, why: 'A 300 ms spike fails the sustain requirement and never reaches SUSPECT.' },
  { s: 'Node offline', o: 'Alert only', trip: false, why: 'Comms loss is a maintenance alert and never a vote toward isolation.' },
];

const MILESTONES = [
  { m: 'M0', t: 'Contract frozen', s: 'done', d: 'PROTOCOL.md and the seven shared vectors merged.' },
  { m: 'M1', t: 'Demo link live', s: 'done', d: 'Simulated feeder, scenario buttons, cascade, real latency.' },
  { m: 'M2', t: 'AFE validated', s: 'next', d: 'Bench characterisation: standoff, temperature, humidity, rain.' },
  { m: 'M3', t: 'Three-node mesh', s: 'next', d: 'Real LoRa gossip between three dev boards; quorum fires correctly.' },
  { m: 'M4', t: 'Gateway trips a relay', s: 'planned', d: 'Physical relay from a real quorum event, measured under 2 s.' },
  { m: 'M5', t: 'Scaled field test', s: 'planned', d: 'Mock pole span, ≤50 V conductor, a physical cut, on video.' },
];

const STATUS_STYLE: Record<string, string> = {
  done: 'bg-good-dim text-good',
  next: 'bg-warning-dim text-warning',
  planned: 'bg-surface-3 text-ink-3',
};

/* ------------------------------------------------------------------- page */

export default function Landing() {
  return (
    <div>
      {/* 00 — hero */}
      <header className="relative overflow-hidden border-b border-line">
        <FieldBackdrop />
        <div className="relative mx-auto max-w-[1080px] px-5 py-16 md:py-24">
          <p className="mb-5 flex flex-wrap items-center gap-2 text-2xs font-semibold uppercase tracking-[.16em] text-ink-3">
            <span className="rounded border border-line bg-surface-2 px-2 py-1">Smart India Hackathon 2026</span>
            <span className="rounded border border-line bg-surface-2 px-2 py-1">Open Innovation</span>
            <span className="rounded border border-line bg-surface-2 px-2 py-1">Disaster Management</span>
          </p>

          <h1 className="max-w-[17ch] text-[40px] font-extrabold leading-[1.02] tracking-[-.035em] md:text-[68px]">
            A live wire on the ground<br />
            <span className="text-critical">draws less than the trip current.</span>
          </h1>

          <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-ink-2">
            So the fuse stays silent. A snapped low-voltage conductor can lie energised on wet earth
            for hours while conventional protection sees nothing at all.
          </p>

          <p className="mt-4 max-w-[58ch] text-base leading-relaxed text-ink-2">
            <strong className="font-semibold text-ink">Closed-Circuit</strong> stops measuring current
            and starts measuring the field. A pole-mounted probe watches the conductor's own 50 Hz
            electric field — no CT, no line tap, no outage to install. When a span breaks, the field
            downstream collapses while the node upstream stays normal, and that asymmetry is the
            signature.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              to="/console"
              onMouseEnter={warmConsole}
              onFocus={warmConsole}
              className="rounded bg-accent px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
            >
              Open the live console →
            </Link>
            <Link
              to="/evidence"
              className="rounded border border-line bg-surface-2 px-5 py-2.5 text-sm font-semibold text-ink-2 transition hover:border-ink-3 hover:text-ink"
            >
              How it decides
            </Link>
          </div>

          <dl className="mt-14 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
            {TARGETS.map((t) => (
              <div key={t.k}>
                <dd className="text-xl font-extrabold tracking-tight">{t.v}</dd>
                <dt className="mt-0.5 text-2xs uppercase tracking-[.1em] text-ink-3">{t.k}</dt>
                <dd
                  className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[.1em] ${
                    t.proven ? 'bg-good-dim text-good' : 'bg-surface-2 text-ink-3'
                  }`}
                  title={t.proven
                    ? 'Produced by code running in this demo'
                    : 'An engineering target — the hardware to confirm it does not exist yet'}
                >
                  {t.proven ? 'measured' : 'target'}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      {/* 01 — the problem */}
      <Section
        n="01"
        title="The fault protection cannot see"
        lead="Overcurrent protection answers one question: is too much current flowing? A conductor lying on dry earth or asphalt is a high-impedance fault. It is lethal to touch and it draws almost nothing, so the honest answer to that question is no — and the fuse does exactly what it was designed to do, which is nothing."
      >
        <Reveal>
          <DetectionGap />
        </Reveal>
      </Section>

      {/* 02 — what we measure instead */}
      <Section
        n="02"
        title="Measure the field, not the current"
        lead="An energised conductor at 230 V radiates a 50 Hz electric field. A conductive plate a few tens of centimetres away develops a tiny displacement current through its stray capacitance to the line — sub-picofarad, but measurable with a high-impedance buffer placed directly behind the plate."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { h: 'Nothing touches the line', p: 'No CT to clamp, no tap to make, no outage to arrange. A node mounts on the pole and is commissioned in minutes, which is what makes covering a whole feeder affordable.' },
            { h: 'It works on unmetered spans', p: 'A smart-meter rollout only sees where meters are. The field exists along the entire span, so the gap between two customers is covered as well as the customers themselves.' },
            { h: 'Collapse is unambiguous', p: 'When the conductor de-energises, the field does not degrade — it goes. That is a far cleaner signal than trying to infer a fault from a current that is barely there.' },
          ].map((c, i) => (
            <Reveal key={c.h} delay={i * 90}>
              <article className="h-full border-t-2 border-accent pt-3">
                <h3 className="text-sm font-bold tracking-tight">{c.h}</h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-2">{c.p}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* 03 — the sequence */}
      <Section
        n="03"
        title="One node is never enough"
        lead="Rain, fog, vegetation contact and switching transients all perturb the field. A single node seeing a collapse is not trustworthy, so nodes gossip over LoRa and a quorum of downstream neighbours must agree inside a 1.5 s vote window before anything is asserted."
      >
        <Reveal><CascadeFilm /></Reveal>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { n: '1', t: 'Detect locally', d: 'Deviation past −60% of the EWMA baseline for five consecutive 50 ms windows. The sustain requirement is what a transient cannot survive.' },
            { n: '2', t: 'Ask the neighbours', d: 'The node asserts SUSPECT and pre-empts routine telemetry to broadcast it. Downstream neighbours answer with their own deviation.' },
            { n: '3', t: 'Reach a quorum', d: 'Two downstream neighbours must agree, and the node immediately upstream must still read NORMAL, or the span is wrong.' },
            { n: '4', t: 'Act at the feeder head', d: 'The gateway runs decide() locally and drives the relay. The cloud is told afterwards; it is never asked first.' },
          ].map((s, i) => (
            <Reveal key={s.n} delay={i * 80}>
              <div className="h-full rounded-panel border border-line bg-surface-1 p-4">
                <span className="cc-mono text-2xs font-bold text-accent">STEP {s.n}</span>
                <h3 className="mt-1 text-sm font-bold tracking-tight">{s.t}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-2">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* 04 — the credibility set */}
      <Section
        n="04"
        title="The half that must not trip"
        lead="Anyone can build a detector that fires. The argument is the set of cases that must not — and every one of them is a committed test vector that both the Python and the C implementation are held to in CI. If the two ever disagree on any vector, the build fails."
      >
        <Reveal>
          <div className="overflow-hidden rounded-panel border border-line">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-surface-2 text-2xs uppercase tracking-[.1em] text-ink-3">
                  <th className="px-4 py-2.5 font-semibold">Scenario</th>
                  <th className="px-4 py-2.5 font-semibold">Verdict</th>
                  <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">Why</th>
                </tr>
              </thead>
              <tbody>
                {SCENARIOS.map((r, i) => (
                  <tr key={r.s} className={`bg-surface-1 ${i ? 'border-t border-line-soft' : ''}`}>
                    <td className="px-4 py-2.5 font-semibold text-ink">{r.s}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span className={`flex items-center gap-1 font-semibold ${r.trip ? 'text-critical' : 'text-accent'}`}>
                        <span aria-hidden="true">{r.trip ? '✕' : '✓'}</span>
                        {r.o}
                      </span>
                    </td>
                    <td className="hidden px-4 py-2.5 text-ink-2 sm:table-cell">{r.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </Section>

      {/* 05 — architecture */}
      <Section
        n="05"
        title="The trip path never touches the internet"
        lead="An LTE round-trip alone can consume the entire two-second budget, and a safety function that depends on a mobile network is not something a utility will deploy. The decision executes on the gateway at the feeder head. The cloud observes, alerts, audits and configures — it does not trip."
      >
        <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <Reveal>
            <div className="h-full rounded-panel border border-line bg-surface-1 p-4">
              <pre className="cc-scroll cc-mono overflow-x-auto text-2xs leading-relaxed text-ink-2">
{`  nodes ──LoRa mesh gossip──▶  GATEWAY  ──drives the relay──▶  span isolated
                              feeder head                     < 2 s · local
                                   │
                                   │  LTE / MQTT   buffered when offline
                                   ▼
                              backend ──WebSocket──▶  operator console
                              observe · alert · audit · configure
                              never in the trip path`}
              </pre>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <ul className="h-full space-y-2.5 rounded-panel border border-line bg-surface-1 p-4">
              {[
                ['Radio fails', 'Alarm raised. No trip — a jammed radio must not de-energise a healthy feeder.'],
                ['LTE fails', 'Keep operating, buffer the uplink. The cloud was never in the loop.'],
                ['Watchdog resets', 'Come up in LOCKOUT and wait for a human to arm it.'],
                ['Two breaks in 10 s', 'Rate-limited to one isolation per feeder per 60 s.'],
                ['Anyone at all', 'A physical lockout switch overrides every line of software.'],
              ].map(([k, v]) => (
                <li key={k} className="flex gap-2.5 text-xs">
                  <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span><strong className="font-semibold text-ink">{k}</strong> <span className="text-ink-2">— {v}</span></span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </Section>

      {/* 06 — targets in detail */}
      <Section
        n="06"
        title="Design targets"
        lead="Each one is something we can be held to — and each says whether it has actually been measured yet or is still a number we are aiming at. Two of these come out of code running in this demo. Two are waiting on hardware that has not been built."
      >
        <div className="grid gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2">
          {TARGETS.map((t, i) => (
            <Reveal key={t.k} delay={i * 70}>
              <div className="h-full bg-surface-1 p-4">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="text-display font-extrabold tracking-tight">{t.v}</span>
                  <span className="text-2xs uppercase tracking-[.1em] text-ink-3">{t.k}</span>
                  <span
                    className={`ml-auto rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[.1em] ${
                      t.proven ? 'bg-good-dim text-good' : 'bg-surface-3 text-ink-3'
                    }`}
                  >
                    {t.proven ? 'measured' : 'target'}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-2">{t.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* 07 — honest status */}
      <Section
        n="07"
        title="Where the build actually is"
        lead="Stated plainly, because a panel will ask and the answer is more convincing than a claim. The software milestones are done and running; the hardware ones are ahead of us."
      >
        <ol className="space-y-px overflow-hidden rounded-panel border border-line bg-line">
          {MILESTONES.map((m, i) => (
            <Reveal key={m.m} delay={i * 55}>
              <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 bg-surface-1 px-4 py-3">
                <span className="cc-mono text-2xs font-bold text-ink-3">{m.m}</span>
                <span className="text-sm font-semibold">{m.t}</span>
                <span className={`rounded px-1.5 py-0.5 text-2xs font-bold uppercase tracking-wide ${STATUS_STYLE[m.s]}`}>
                  {m.s}
                </span>
                <span className="w-full text-xs text-ink-2 sm:w-auto sm:flex-1">{m.d}</span>
              </li>
            </Reveal>
          ))}
        </ol>
      </Section>

      {/* 08 — honesty + CTA */}
      <section className="border-t border-line py-14 md:py-20">
        <div className="mx-auto max-w-[1080px] px-5">
          <Reveal>
            <div className="rounded-panel border border-accent bg-accent-dim p-5">
              <h2 className="text-lg font-bold tracking-tight">Simulated feeder, live consensus engine</h2>
              <p className="mt-2 max-w-[74ch] text-sm leading-relaxed text-ink-2">
                The twelve nodes are a virtual feeder built on real OpenStreetMap geometry in
                Thiruvananthapuram. Everything downstream of them is real code running live: the
                arbiter, the quorum logic, the five veto rules and every millisecond figure you will
                see. It is the same <code className="cc-mono text-ink">decide()</code> that is ported
                to C for the gateway and the node firmware, held to one shared set of test vectors in
                CI. No utility has deployed this and none has reviewed it — the pilot is a proposal,
                and we would rather say so here than have it discovered.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/console"
                  onMouseEnter={warmConsole}
                  onFocus={warmConsole}
                  className="rounded bg-accent px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
                >
                  Open the live console →
                </Link>
                <Link
                  to="/evidence"
                  className="rounded border border-line bg-surface-1 px-5 py-2.5 text-sm font-semibold text-ink-2 transition hover:border-ink-3 hover:text-ink"
                >
                  Read how it decides
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
