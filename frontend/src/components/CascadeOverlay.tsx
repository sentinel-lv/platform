import { useFeeder } from '../store/feederStore';

/**
 * The break banner, overlaid on the map.
 *
 * It deliberately does NOT repeat the millisecond figure at hero size —
 * that number has one home, the KPI strip, and showing it twice at
 * competing sizes is how a dashboard stops having a focal point. This
 * panel answers the other questions: which span, on whose votes, how sure.
 *
 * Animation timing here is illustrative. Every number rendered is the
 * backend's own, never a value counted up for effect.
 */
export default function CascadeOverlay() {
  const last = useFeeder((s) => s.lastFault);
  const dismissed = useFeeder((s) => s.dismissCascade);
  const setDismiss = useFeeder((s) => s.setDismissCascade);
  if (!last || dismissed) return null;

  const [a, b] = last.fault_span ?? ['?', '?'];
  const votes = last.trail.filter((t) => t.state === 'SUSPECT').length;

  return (
    <div
      data-testid="cascade"
      role="alert"
      className="cc-rise pointer-events-auto absolute left-3 right-3 top-3 z-10 overflow-hidden rounded-panel border border-critical bg-surface-1/95 shadow-lift backdrop-blur"
    >
      <div className="flex items-start gap-3 p-3">
        <span aria-hidden="true" className="cc-pulse mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-critical text-sm font-bold text-white">
          ✕
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-bold tracking-tight text-critical">CONDUCTOR BREAK</h3>
            <span className="cc-mono text-sm font-bold text-ink">{a} ↔ {b}</span>
          </div>

          <p className="mt-0.5 text-xs text-ink-2">
            {votes} downstream {votes === 1 ? 'neighbour' : 'neighbours'} agreed · quorum reached ·{' '}
            <span className="cc-mono tabular-nums">{(last.confidence * 100).toFixed(0)}%</span> confidence ·{' '}
            {last.isolated ? (
              <span className="text-critical">span asserted</span>
            ) : (
              <span className="text-warning">alert only — operator must dispatch</span>
            )}
          </p>

          <p className="mt-1 text-2xs text-ink-3">
            Decided on the gateway at the feeder head. This view is the audit copy.
          </p>
        </div>

        <button
          onClick={() => setDismiss(true)}
          className="shrink-0 rounded px-1.5 py-0.5 text-2xs font-semibold text-ink-3 transition hover:bg-surface-3 hover:text-ink-2"
          aria-label="Dismiss break banner"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
