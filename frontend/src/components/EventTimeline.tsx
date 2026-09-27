import { useState } from 'react';
import { useFeeder, isConfirmedFault } from '../store/feederStore';
import type { FeederEvent } from '../types/protocol';
import { Empty, Panel } from './ui';

/** machine reasons (single_node_no_quorum) -> human words for the demo wall */
function prettyReason(r: string): string {
  return r.replace(/_/g, ' ');
}

interface Kind { label: string; cls: string; glyph: string }

function kindOf(e: FeederEvent): Kind {
  // A confirmed fault is a BREAK whether or not the feeder's mode let the
  // gateway act on it. Keying this on `isolated` labelled every break in the
  // default ALERT_ONLY mode as a generic "ALERT", which buries the one event
  // the whole demo exists to show.
  if (e.isolated) return { label: 'ISOLATED', cls: 'bg-critical text-white', glyph: '✕' };
  if (isConfirmedFault(e)) return { label: 'BREAK', cls: 'bg-critical text-white', glyph: '✕' };
  if (e.type === 'FALSE_POSITIVE_REJECTED') return { label: 'REJECTED', cls: 'bg-accent-dim text-accent', glyph: '✓' };
  if (e.type === 'NODE_OFFLINE') return { label: 'OFFLINE', cls: 'bg-surface-3 text-ink-3', glyph: '○' };
  if (e.type === 'LOW_BATTERY') return { label: 'BATTERY', cls: 'bg-warning-dim text-warning', glyph: '▾' };
  return { label: 'ALERT', cls: 'bg-warning-dim text-warning', glyph: '▲' };
}

function clock(ts: number) {
  return new Date(ts).toLocaleTimeString('en-GB', { hour12: false });
}

export default function EventTimeline() {
  const events = useFeeder((s) => s.events);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <Panel
      title="Event timeline"
      right={<span className="cc-mono text-2xs tabular-nums text-ink-3">{events.length} events</span>}
      className="relative z-[1] h-[218px] shrink-0"
      dense
      bodyClassName="flex flex-col"
    >
      {events.length === 0 ? (
        <Empty>No events yet — fire a scenario to see the consensus engine decide.</Empty>
      ) : (
        <ul className="cc-scroll flex min-h-0 flex-1 flex-col divide-y divide-line-soft overflow-y-auto">
          {events.map((e) => {
            const k = kindOf(e);
            const isOpen = open === e.event_id;
            return (
              <li key={e.event_id} data-testid={`event-${e.event_id}`} className="px-2.5">
                <button
                  className="flex w-full items-center gap-2.5 py-2 text-left"
                  onClick={() => setOpen(isOpen ? null : e.event_id)}
                  aria-expanded={isOpen}
                >
                  <span className={`flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-bold tracking-wide ${k.cls}`}>
                    <span aria-hidden="true">{k.glyph}</span>
                    {k.label}
                  </span>

                  <span className="cc-mono shrink-0 text-2xs tabular-nums text-ink-3">{clock(e.ts_confirmed)}</span>

                  <span className="min-w-0 flex-1 truncate text-xs text-ink-2">
                    {e.fault_span ? (
                      <span className="cc-mono font-semibold text-ink">
                        {e.fault_span[0]} ↔ {e.fault_span[1]}
                      </span>
                    ) : (
                      prettyReason(e.reason)
                    )}
                  </span>

                  {e.latency_ms !== null && e.latency_ms !== undefined && (
                    <span
                      data-testid={`latency-${e.event_id}`}
                      title="Measured from the earliest SUSPECT in the trail to command issue"
                      className="cc-mono shrink-0 rounded bg-surface-3 px-1.5 py-0.5 text-2xs font-bold tabular-nums text-ink"
                    >
                      {e.latency_ms} ms
                    </span>
                  )}

                  <span aria-hidden="true" className={`shrink-0 text-ink-3 transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
                </button>

                {isOpen && (
                  <div className="cc-rise mb-2 rounded border border-line bg-surface-2 p-2">
                    <dl className="mb-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-2xs">
                      <div className="flex gap-1"><dt className="text-ink-3">type</dt><dd className="cc-mono text-ink-2">{e.type}</dd></div>
                      <div className="flex gap-1"><dt className="text-ink-3">reason</dt><dd className="cc-mono text-ink-2">{e.reason}</dd></div>
                      <div className="flex gap-1"><dt className="text-ink-3">confidence</dt><dd className="cc-mono tabular-nums text-ink-2">{(e.confidence * 100).toFixed(0)}%</dd></div>
                      <div className="flex gap-1"><dt className="text-ink-3">isolated</dt><dd className="cc-mono text-ink-2">{String(e.isolated)}</dd></div>
                    </dl>

                    {/* The vote trail: who saw what, and when. */}
                    <div className="text-2xs font-semibold uppercase tracking-[.1em] text-ink-3">Vote trail</div>
                    <ol className="mt-1 space-y-0.5">
                      {e.trail.map((t, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="cc-mono w-[64px] shrink-0 text-2xs tabular-nums text-ink-3">{clock(t.ts)}</span>
                          <span aria-hidden="true" className="text-ink-3">{i === e.trail.length - 1 ? '└' : '├'}</span>
                          <span className="cc-mono text-2xs font-semibold text-ink-2">{t.node}</span>
                          <span className="cc-mono text-2xs text-ink-3">{t.state}</span>
                          {i > 0 && (
                            <span className="cc-mono ml-auto text-2xs tabular-nums text-ink-3">
                              +{t.ts - e.trail[0].ts} ms
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
