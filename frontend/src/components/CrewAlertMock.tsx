import { useFeeder } from '../store/feederStore';

// Phone frame showing the lineman's push (mock).
export default function CrewAlertMock() {
  const banner = useFeeder((s) => s.lastIsolate);
  const events = useFeeder((s) => s.events);
  // crew phone keeps the most recent BREAK even after the banner clears on recovery
  const last = banner ?? events.find((e) => e.isolated) ?? null;
  const sub = useFeeder((s) => s.substation);
  return (
    <section aria-label="Crew alert" className="cc-panel overflow-hidden">
      <div className="border-b-[1.5px] border-ink px-3 py-2">
        <h2 className="font-display text-sm font-extrabold tracking-tight">Crew alert</h2>
        <p className="mt-0.5 text-[11px] text-ink/70">What the lineman sees on the phone.</p>
      </div>
      <div className="bg-paper/50 p-3">
        <div className="mx-auto w-52 border-2 border-ink bg-moss p-2 shadow-plate">
          <div className="border border-porcelain/30 bg-porcelain p-2.5">
            <p className="cc-tick text-[10px] font-bold tracking-wide text-ink/60">
              {last ? 'PUSH · JUST NOW' : 'PUSH · IDLE'}
            </p>
            <p className="mt-1 font-display text-xs font-extrabold">
              {last ? 'Fault isolated' : 'No isolation yet'}
            </p>
            {last && last.fault_span ? (
              <div className="cc-tick mt-1.5 border-t border-dashed border-ink/30 pt-1.5 text-[11px] leading-relaxed">
                Span {last.fault_span[0]} ↔ {last.fault_span[1]}
                <br />
                {sub.lat.toFixed(4)}, {sub.lng.toFixed(4)}
                <br />
                {last.latency_ms} ms · {new Date(last.ts_confirmed).toLocaleTimeString()}
              </div>
            ) : (
              <p className="mt-1 text-xs text-ink/60">The phone stays quiet until quorum fires.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
