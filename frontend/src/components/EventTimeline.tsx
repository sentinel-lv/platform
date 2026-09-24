import { useState } from 'react';
import { useFeeder } from '../store/feederStore';

// machine reasons (single_node_no_quorum) -> human words for the demo wall
function prettyReason(r: string): string {
  return r.replace(/_/g, ' ');
}

const STAMP: Record<string, string> = {
  BREAK: 'bg-fault text-porcelain border-fault',
  REJECTED: 'border-recover bg-recover/10 text-recover',
  OFFLINE: 'border-stone-500 bg-stone-200 text-stone-700',
  ALERT: 'border-wire bg-amber-200/70 text-ink',
};

function stampFor(e: { isolated: boolean; type: string }): { label: string; cls: string } {
  if (e.isolated) return { label: 'BREAK', cls: STAMP.BREAK };
  if (e.type === 'FALSE_POSITIVE_REJECTED') return { label: 'REJECTED', cls: STAMP.REJECTED };
  if (e.type === 'NODE_OFFLINE') return { label: 'OFFLINE', cls: STAMP.OFFLINE };
  return { label: 'ALERT', cls: STAMP.ALERT };
}

export default function EventTimeline() {
  const events = useFeeder((s) => s.events);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section aria-label="Event ledger" className="cc-panel overflow-hidden">
      <div className="flex items-baseline justify-between border-b-[1.5px] border-ink px-3 py-2">
        <h2 className="font-display text-sm font-extrabold tracking-tight">Event ledger</h2>
        <p className="cc-tick text-[11px] text-ink/70">newest first</p>
      </div>
      <div className="bg-paper/50 p-2">
        {events.length === 0 && (
          <p className="p-2 text-sm text-ink/70">
            Nothing recorded yet — run a field trial above.
          </p>
        )}
        <ul className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
          {events.map((e) => {
            const stamp = stampFor(e);
            const expanded = open === e.event_id;
            return (
              <li
                key={e.event_id}
                data-testid={`event-${e.event_id}`}
                className={`border bg-porcelain px-2 py-1.5 text-xs ${
                  e.isolated ? 'border-fault' : 'border-ink/25'
                }`}
              >
                <button
                  className="flex w-full items-center gap-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-insulator"
                  onClick={() => setOpen(expanded ? null : e.event_id)}
                  aria-expanded={expanded}
                >
                  <span
                    className={`cc-tick shrink-0 border px-1 py-0.5 text-[10px] font-bold ${stamp.cls}`}
                  >
                    {stamp.label}
                  </span>
                  <span className="cc-tick text-ink/80">
                    {new Date(e.ts_confirmed).toLocaleTimeString()}
                  </span>
                  <span className="font-semibold leading-tight">
                    {e.fault_span
                      ? `${e.fault_span[0]} ↔ ${e.fault_span[1]}`
                      : prettyReason(e.reason)}
                  </span>
                  {e.latency_ms !== null && e.latency_ms !== undefined && (
                    <span
                      data-testid={`latency-${e.event_id}`}
                      className="cc-tick ml-auto border border-ink bg-ink px-1.5 py-0.5 text-porcelain"
                    >
                      {e.latency_ms} ms
                    </span>
                  )}
                </button>
                {expanded && (
                  <div className="mt-1.5 border-t border-dashed border-ink/30 pt-1.5 text-[11px] text-ink/75">
                    <p className="cc-tick">
                      reason {e.reason} · confidence {(e.confidence * 100).toFixed(0)}% · {e.type}
                    </p>
                    {e.trail.map((t, i) => (
                      <p key={i} className="cc-tick">
                        {new Date(t.ts).toLocaleTimeString()} · {t.node} · {t.state}
                      </p>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
