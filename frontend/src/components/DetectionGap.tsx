/**
 * Why conventional protection does not see a downed conductor.
 *
 * Deliberately a ranking, not a measurement. The claim that matters is the
 * ORDER — a broken conductor lying on dry ground draws less than the pickup
 * current an overcurrent device needs — and inventing precise ampere figures
 * to dress that up would be the kind of thing a utility engineer on the panel
 * takes apart in one question. So the axis is unlabelled by design and the
 * caption says so.
 */
const BANDS = [
  {
    label: 'Bolted short circuit',
    note: 'phase-to-phase or solid earth fault',
    width: 100,
    tone: 'bg-good',
    text: 'text-good',
    seen: true,
  },
  {
    label: 'Overcurrent pickup',
    note: 'the threshold the fuse or relay is set to',
    width: 38,
    tone: 'bg-accent',
    text: 'text-accent',
    threshold: true,
  },
  {
    label: 'Conductor down on wet earth',
    note: 'sometimes seen, often not',
    width: 22,
    tone: 'bg-warning',
    text: 'text-warning',
    seen: false,
  },
  {
    label: 'Conductor down on dry earth or asphalt',
    note: 'high-impedance fault — invisible to overcurrent protection',
    width: 9,
    tone: 'bg-critical',
    text: 'text-critical',
    seen: false,
  },
];

export default function DetectionGap() {
  return (
    <figure className="rounded-panel border border-line bg-surface-1 p-4 sm:p-5">
      <figcaption className="text-2xs font-bold uppercase tracking-[.14em] text-ink-3">
        Fault current, by severity
      </figcaption>

      <div className="mt-4 space-y-2.5">
        {BANDS.map((b) => (
          <div key={b.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className={`text-xs font-semibold ${b.threshold ? b.text : 'text-ink'}`}>
                {b.label}
              </span>
              {b.threshold ? (
                <span className="text-2xs font-semibold uppercase tracking-wide text-accent">threshold</span>
              ) : (
                <span className={`flex items-center gap-1 text-2xs font-semibold ${b.seen ? 'text-good' : 'text-critical'}`}>
                  <span aria-hidden="true">{b.seen ? '✓' : '✕'}</span>
                  {b.seen ? 'trips' : 'does not trip'}
                </span>
              )}
            </div>

            <div className="mt-1 h-2.5 w-full rounded-full bg-surface-3">
              <div
                className={`h-full rounded-full ${b.tone} ${b.threshold ? 'opacity-100' : ''}`}
                style={{ width: `${b.width}%` }}
              />
            </div>
            <p className="mt-0.5 text-2xs text-ink-3">{b.note}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 border-t border-line-soft pt-3 text-2xs leading-relaxed text-ink-3">
        <strong className="font-semibold text-ink-2">Indicative ordering, not measured values.</strong>{' '}
        The axis is deliberately unlabelled: the claim is that a downed conductor on dry ground sits
        below the pickup an overcurrent device needs, which is why the fuse stays silent while the
        wire stays live. Closed-Circuit does not measure current at all — it watches the conductor's
        electric field, which collapses whether or not any fault current flows.
      </p>
    </figure>
  );
}
