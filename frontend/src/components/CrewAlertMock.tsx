import { useFeeder } from '../store/feederStore';

// Phone frame showing the lineman's push (mock).
export default function CrewAlertMock() {
  const banner = useFeeder((s) => s.lastFault);
  const events = useFeeder((s) => s.events);
  // crew phone keeps the most recent BREAK even after the banner clears on recovery
  const last = banner ?? events.find((e) => e.isolated) ?? null;
  const sub = useFeeder((s) => s.substation);
  return (
    <div className="rounded border bg-white p-2 shadow-sm">
      <div className="mb-1 text-sm font-bold">Crew alert (mock)</div>
      <div className="mx-auto w-52 rounded-2xl border-4 border-slate-800 bg-slate-100 p-2">
        <div className="rounded bg-white p-2 shadow">
          <div className="text-xs font-bold">⚡ Fault isolated</div>
          {last && last.fault_span ? (
            <div className="mt-1 text-xs">
              Span {last.fault_span[0]} {'<->'} {last.fault_span[1]}
              <br />{sub.lat.toFixed(4)}, {sub.lng.toFixed(4)}
              <br />{last.latency_ms} ms · {new Date(last.ts_confirmed).toLocaleTimeString()}
            </div>
          ) : (
            <div className="mt-1 text-xs text-slate-500">No isolation yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
