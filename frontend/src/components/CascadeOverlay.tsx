import { useFeeder } from '../store/feederStore';

// Cascade animation: amber → votes → quorum → red + the REAL latency_ms.
// Animation timing is illustrative; the millisecond number is backend truth.
export default function CascadeOverlay() {
  const last = useFeeder((s) => s.lastIsolate);
  const dismissed = useFeeder((s) => s.dismissCascade);
  const setDismiss = useFeeder((s) => s.setDismissCascade);
  if (!last || dismissed) return null;
  const [a, b] = last.fault_span ?? ['?', '?'];
  return (
    <div data-testid="cascade" className="rounded border-2 border-red-600 bg-red-50 p-3 shadow">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-red-800">
          <span className="cascade-pulse mr-2 inline-block h-2.5 w-2.5 rounded-full bg-red-600" />
          CONDUCTOR BREAK {a} {'<->'} {b}
        </div>
        <button onClick={() => setDismiss(true)} className="text-xs text-slate-500">dismiss</button>
      </div>
      <div className="mt-1 text-xs text-slate-700">
        SUSPECT → quorum ({last.trail.length} votes) → ISOLATE · confidence {(last.confidence * 100).toFixed(0)}%
      </div>
      <div data-testid="cascade-latency" className="mt-1 font-mono text-3xl font-black text-red-700">
        {last.latency_ms} ms
      </div>
      <div className="text-[11px] text-slate-500">detection→isolation latency (gateway-measured)</div>
    </div>
  );
}
