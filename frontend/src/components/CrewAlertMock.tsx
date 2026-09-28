import { useState } from 'react';
import { api } from '../api/client';
import { useFeeder, isConfirmedFault } from '../store/feederStore';
import { Panel } from './ui';

/**
 * What the lineman's phone shows. A mock of the crew push, so the dispatch
 * half of the story is visible without building the PWA.
 */
export default function CrewAlertMock() {
  const events = useFeeder((s) => s.events);
  const sub = useFeeder((s) => s.substation);
  const poles = useFeeder((s) => s.poles);
  const markAcknowledged = useFeeder((s) => s.markAcknowledged);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // keeps the most recent confirmed fault even after the banner clears
  const last = events.find(isConfirmedFault) ?? null;

  // Dispatch to the upstream end of the asserted span — that is the pole a
  // crew drives to, not the feeder head.
  const target = last?.fault_span
    ? poles.find((p) => p.node_id === last.fault_span![0]) ?? null
    : null;
  const lat = target?.lat ?? sub.lat;
  const lng = target?.lng ?? sub.lng;

  const accept = async () => {
    if (!last || busy) return;
    setBusy(true); setErr(null);
    try {
      // A real call: POST /events/{id}/ack sets acknowledged_by and writes an
      // audit row, so pressing this shows up in the Audit view.
      const updated = await api.ackEvent(last.event_id, 'crew-1');
      markAcknowledged(last.event_id, updated.acknowledged_by ?? 'crew-1');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'acknowledge failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Crew alert · mock push" className="mx-auto w-full max-w-md">
      <div className="mx-auto w-[260px] rounded-[26px] border-[6px] border-surface-3 bg-black p-2 shadow-lift">
        <div className="mx-auto mb-2 h-1 w-14 rounded-full bg-surface-3" />

        {last && last.fault_span ? (
          <div className="rounded-xl border border-line bg-surface-2 p-2.5">
            <div className="flex items-center gap-1.5">
              <span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded bg-critical text-2xs font-bold text-white">✕</span>
              <span className="text-xs font-bold text-critical">Conductor break</span>
              <span className="cc-mono ml-auto text-2xs text-ink-3">now</span>
            </div>

            <div className="cc-mono mt-2 text-sm font-bold">
              {last.fault_span[0]} ↔ {last.fault_span[1]}
            </div>

            <dl className="mt-1.5 space-y-0.5 text-2xs">
              <div className="flex gap-1.5">
                <dt className="text-ink-3">Dispatch to</dt>
                <dd className="cc-mono tabular-nums text-ink-2">{lat.toFixed(4)}, {lng.toFixed(4)}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-ink-3">Detected in</dt>
                <dd className="cc-mono tabular-nums text-ink-2">{last.latency_ms} ms</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-ink-3">At</dt>
                <dd className="cc-mono tabular-nums text-ink-2">
                  {new Date(last.ts_confirmed).toLocaleTimeString('en-GB', { hour12: false })}
                </dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-ink-3">Status</dt>
                <dd className={last.isolated ? 'font-semibold text-critical' : 'font-semibold text-warning'}>
                  {last.isolated ? 'Span de-energised' : 'ALERT ONLY — treat span as LIVE'}
                </dd>
              </div>
            </dl>

            <div className="mt-2.5 grid grid-cols-2 gap-1.5">
              <button
                data-testid="crew-accept"
                onClick={accept}
                disabled={busy || !!last.acknowledged_by}
                className={`min-h-[34px] rounded text-2xs font-bold transition disabled:cursor-default ${
                  last.acknowledged_by
                    ? 'bg-good-dim text-good'
                    : 'bg-accent text-white hover:brightness-110 disabled:opacity-60'
                }`}
              >
                {last.acknowledged_by ? `✓ Accepted · ${last.acknowledged_by}` : busy ? 'Accepting…' : 'Accept'}
              </button>
              <a
                data-testid="crew-navigate"
                href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[34px] items-center justify-center rounded border border-line text-2xs font-semibold text-ink-2 transition hover:border-ink-3 hover:text-ink"
              >
                Navigate ↗
              </a>
            </div>

            {err && (
              <div role="alert" className="mt-1.5 text-2xs text-critical">{err}</div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-line bg-surface-2 p-4 text-center text-2xs text-ink-3">
            No fault dispatched.<br />The crew phone stays quiet until quorum.
          </div>
        )}
      </div>

      <p className="mt-2 text-center text-2xs leading-snug text-ink-3">
        The phone frame is a mock, but both buttons are real: <strong className="text-ink-2">Accept</strong>{' '}
        posts to <code className="cc-mono">/events/&#123;id&#125;/ack</code> and lands in the audit log,
        and <strong className="text-ink-2">Navigate</strong> opens directions to the upstream end of the
        span. The full crew PWA (accept → navigate → mark restored) is post-submission work.
      </p>
    </Panel>
  );
}
