import { useFeeder, isConfirmedFault } from '../store/feederStore';
import { Panel } from './ui';

/**
 * What the lineman's phone shows. A mock of the crew push, so the dispatch
 * half of the story is visible without building the PWA.
 */
export default function CrewAlertMock() {
  const events = useFeeder((s) => s.events);
  const sub = useFeeder((s) => s.substation);
  // keeps the most recent confirmed fault even after the banner clears
  const last = events.find(isConfirmedFault) ?? null;

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
                <dt className="text-ink-3">Feeder head</dt>
                <dd className="cc-mono tabular-nums text-ink-2">{sub.lat.toFixed(4)}, {sub.lng.toFixed(4)}</dd>
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
              <span className="rounded bg-accent py-1.5 text-center text-2xs font-bold text-white">Accept</span>
              <span className="rounded border border-line py-1.5 text-center text-2xs font-semibold text-ink-2">Navigate</span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-line bg-surface-2 p-4 text-center text-2xs text-ink-3">
            No fault dispatched.<br />The crew phone stays quiet until quorum.
          </div>
        )}
      </div>

      <p className="mt-2 text-center text-2xs text-ink-3">
        Mock of the crew push. The PWA (accept → navigate → mark restored) is post-submission work.
      </p>
    </Panel>
  );
}
