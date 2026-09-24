import { useFeeder } from '../store/feederStore';

// Cascade: amber suspicions, neighbour votes, quorum, then the red span.
// The animation is illustrative; the millisecond number is backend truth.
export default function CascadeOverlay() {
  const last = useFeeder((s) => s.lastIsolate);
  const dismissed = useFeeder((s) => s.dismissCascade);
  const setDismiss = useFeeder((s) => s.setDismissCascade);
  if (!last || dismissed) return null;
  const [a, b] = last.fault_span ?? ['?', '?'];
  const votes = last.trail.length;
  return (
    <div
      data-testid="cascade"
      className="cascade-enter overflow-hidden border-2 border-ink bg-fault text-porcelain shadow-plate"
    >
      <div className="flex items-center justify-between gap-2 border-b border-porcelain/25 bg-faultdeep px-3 py-1.5">
        <p className="cc-tick text-[11px] tracking-wide text-porcelain/80">
          Quorum confirmed · {votes} {votes === 1 ? 'vote' : 'votes'} · confidence{' '}
          {(last.confidence * 100).toFixed(0)}%
        </p>
        <button
          onClick={() => setDismiss(true)}
          className="text-[11px] font-semibold text-porcelain/80 underline decoration-dotted underline-offset-2 hover:text-porcelain focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200"
        >
          Dismiss
        </button>
      </div>
      <div className="px-4 pb-4 pt-3">
        <p className="flex items-center gap-2 font-display text-lg font-extrabold leading-tight">
          <span className="cascade-pulse inline-block h-3 w-3 rounded-full bg-amber-300" />
          Conductor break {a} ↔ {b}
        </p>
        <p className="mt-1 text-xs text-porcelain/80">
          Suspect → quorum → isolate. Field collapsed downstream of {a}; {a} stayed normal, so the
          span holds.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-1">
          <p
            data-testid="cascade-latency"
            className="cc-tick text-5xl font-bold leading-none tracking-tight"
          >
            {last.latency_ms}
            <span className="ml-1 align-middle text-sm font-semibold tracking-normal">ms</span>
          </p>
          <p className="pb-1 text-[11px] leading-snug text-porcelain/75">
            Detection to isolation,
            <br />
            gateway-measured
          </p>
        </div>
      </div>
    </div>
  );
}
