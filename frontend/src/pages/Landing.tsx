import CascadeFilm from '../components/CascadeFilm';
import { Link } from '../router';

const TARGETS = [
  { v: '< 2 s', k: 'detection → isolation', hint: 'Measured on every event as latency_ms, from the first SUSPECT to command issue' },
  { v: '₹1,800', k: 'BOM per node', hint: 'Prototype quantity, with a 1,000-unit projection maintained in hardware/BOM.csv' },
  { v: '< 5 mA', k: 'average current', hint: '6 V 1 W panel + one 18650 LiFePO4, sized for five days of monsoon overcast' },
  { v: '0', k: 'false trips in the bench set', hint: 'Rain, vegetation, substation outage and switching transients all refused' },
];

export default function Landing() {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 py-10 md:py-16">
      <p className="mb-4 flex flex-wrap items-center gap-2 text-2xs font-semibold uppercase tracking-[.16em] text-ink-3">
        <span className="rounded border border-line bg-surface-2 px-2 py-1">Smart India Hackathon 2026</span>
        <span className="rounded border border-line bg-surface-2 px-2 py-1">Open Innovation</span>
        <span className="rounded border border-line bg-surface-2 px-2 py-1">Disaster Management</span>
      </p>

      <h1 className="max-w-[18ch] text-[40px] font-extrabold leading-[1.05] tracking-[-.03em] md:text-[62px]">
        A live wire on the ground<br />
        <span className="text-critical">draws less than the trip current.</span>
      </h1>

      <p className="mt-5 max-w-[62ch] text-lg text-ink-2">
        So the fuse stays silent. A snapped low-voltage conductor can lie energised on wet earth for
        hours, and conventional overcurrent protection never sees it. That is an electrocution and
        fire risk with no automatic detection anywhere in the loop.
      </p>

      <p className="mt-4 max-w-[62ch] text-base text-ink-2">
        <strong className="font-semibold text-ink">Closed-Circuit</strong> watches the electric field the
        conductor radiates — no CT, no line tap, no outage to install. When a span breaks, the field
        downstream collapses while the node upstream stays normal. That asymmetry is the signature.
        Nodes gossip it over LoRa, a quorum of neighbours must agree, and only then does the gateway
        at the feeder head open the span.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          to="/console"
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

      <div className="mt-12">
        <CascadeFilm />
      </div>

      <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-line bg-line md:grid-cols-4">
        {TARGETS.map((t) => (
          <div key={t.k} className="bg-surface-1 px-4 py-4" title={t.hint}>
            <dt className="text-2xs font-semibold uppercase tracking-[.12em] text-ink-3">{t.k}</dt>
            <dd className="mt-1 text-display font-extrabold tracking-tight">{t.v}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          {
            h: 'The decision runs at the feeder head',
            p: 'Not in the cloud. An LTE round-trip alone can blow the two-second budget, and a safety function that depends on a mobile network is not something a utility will deploy. The cloud observes, alerts and audits — it never trips.',
          },
          {
            h: 'One node is never enough',
            p: 'Rain, fog, vegetation contact and switching transients all perturb the field. A single node seeing a collapse is not trustworthy, so isolation requires a quorum of downstream neighbours inside a 1.5 s vote window.',
          },
          {
            h: 'Default is alert, not trip',
            p: 'Every feeder ships in ALERT_ONLY. Auto-isolation is opted into per feeder by the utility, not by us — and there is no auto-reclose in v1, because reclosing onto a downed conductor is how people die.',
          },
        ].map((c) => (
          <article key={c.h} className="rounded-panel border border-line bg-surface-1 p-4">
            <h3 className="text-sm font-bold tracking-tight">{c.h}</h3>
            <p className="mt-2 text-xs leading-relaxed text-ink-2">{c.p}</p>
          </article>
        ))}
      </section>

      <p className="mt-10 rounded-panel border border-line bg-surface-2 px-4 py-3 text-xs text-ink-2">
        <strong className="font-semibold text-ink">Simulated feeder, live consensus engine.</strong>{' '}
        The twelve nodes are a virtual feeder on real OpenStreetMap geometry in Thiruvananthapuram.
        The arbiter, the quorum logic, the veto rules and every millisecond figure are real code
        running live — the same <code className="cc-mono text-ink">decide()</code> that is ported to C
        for the gateway and the node firmware, and held to a shared set of test vectors in CI.
        No utility has deployed this; the pilot is a proposal.
      </p>
    </div>
  );
}
