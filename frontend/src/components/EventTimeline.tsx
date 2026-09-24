import { useState } from 'react';
import { useFeeder } from '../store/feederStore';

// machine reasons (single_node_no_quorum) -> human words for the demo wall
function prettyReason(r: string): string {
  return r.replace(/_/g, ' ');
}

export default function EventTimeline() {
  const events = useFeeder((s) => s.events);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="rounded border bg-white p-2 shadow-sm">
      <div className="mb-1 text-sm font-bold">Event timeline</div>
      {events.length === 0 && <div className="p-2 text-sm text-slate-500">No events yet — fire a scenario.</div>}
      <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
        {events.map((e) => (
          <li key={e.event_id} data-testid={`event-${e.event_id}`} className="rounded border px-2 py-1 text-xs">
            <button className="flex w-full items-center gap-2 text-left" onClick={() => setOpen(open === e.event_id ? null : e.event_id)}>
              <span className={`shrink-0 rounded px-1 font-bold ${e.isolated ? 'bg-red-600 text-white' : e.type === 'FALSE_POSITIVE_REJECTED' ? 'bg-teal-100 text-teal-800' : e.type === 'NODE_OFFLINE' ? 'bg-gray-200 text-gray-700' : 'bg-amber-100 text-amber-800'}`}>
                {e.isolated ? 'BREAK' : e.type === 'FALSE_POSITIVE_REJECTED' ? 'REJECTED' : e.type === 'NODE_OFFLINE' ? 'OFFLINE' : 'ALERT'}
              </span>
              <span className="font-mono">{new Date(e.ts_confirmed).toLocaleTimeString()}</span>
              <span>{e.fault_span ? `${e.fault_span[0]} <-> ${e.fault_span[1]}` : prettyReason(e.reason)}</span>
              {e.latency_ms !== null && e.latency_ms !== undefined && (
                <span data-testid={`latency-${e.event_id}`} className="ml-auto rounded bg-slate-800 px-1.5 py-0.5 font-mono text-white">
                  {e.latency_ms} ms
                </span>
              )}
            </button>
            {open === e.event_id && (
              <div className="mt-1 border-t pt-1 text-[11px] text-slate-600">
                <div>reason={e.reason} · confidence={(e.confidence * 100).toFixed(0)}% · {e.type}</div>
                {e.trail.map((t, i) => (
                  <div key={i} className="font-mono">{new Date(t.ts).toLocaleTimeString()} {t.node} {t.state}</div>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
