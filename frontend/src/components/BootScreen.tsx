import { useEffect, useState } from 'react';
import { useFeeder } from '../store/feederStore';
import { Btn } from './ui';

/**
 * Cold-start screen.
 *
 * The backend runs on a free tier that sleeps when idle, so a judge opening
 * the link cold can wait the better part of a minute. Silence for that long
 * reads as "broken", so this does three things: says plainly what is
 * happening and why, shows elapsed time so it is visibly progressing, and
 * draws the feeder stroking itself in so the wait is the first frame of the
 * story rather than dead time.
 *
 * It deliberately never fabricates data to fill the gap.
 */
export default function BootScreen({ onRetry }: { onRetry?: () => void }) {
  const backend = useFeeder((s) => s.backend);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 250);
    return () => clearInterval(id);
  }, []);

  const failed = backend === 'unreachable';
  // A cold start is typically 30-50 s; cap the bar so it never reads as stuck
  // at 100% while still waiting.
  const pct = Math.min(95, (elapsed / 45) * 100);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-bg px-6 py-10">
      <svg viewBox="0 0 320 90" className="w-full max-w-[320px]" aria-hidden="true">
        <line
          className={failed ? undefined : 'cc-boot-line'}
          x1="20" y1="48" x2="300" y2="48"
          stroke={failed ? 'var(--cc-text-3)' : 'var(--cc-good)'}
          strokeWidth="2.5" strokeLinecap="round"
        />
        {[20, 76, 132, 188, 244, 300].map((x, i) => (
          <g key={x}>
            <line x1={x} y1="48" x2={x} y2="72" stroke="var(--cc-line)" strokeWidth="2" />
            <circle
              className={failed ? undefined : 'cc-boot-node'}
              cx={x} cy="48" r="5.5"
              fill={failed ? 'var(--cc-text-3)' : 'var(--cc-good)'}
              style={{ animationDelay: `${0.35 + i * 0.13}s` }}
            />
          </g>
        ))}
        <rect x="4" y="38" width="14" height="20" rx="3"
          fill="var(--cc-surface-2)" stroke="var(--cc-accent)" strokeWidth="1.5" />
      </svg>

      <div className="w-full max-w-md text-center">
        {failed ? (
          <>
            <h1 className="text-lg font-bold tracking-tight">The feeder service did not wake</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              The backend is hosted on a free tier and should start within a minute. It has not
              answered, which usually means it is still spinning up rather than that anything is
              wrong.
            </p>
            {onRetry && (
              <Btn variant="primary" className="mt-4" onClick={onRetry}>
                Try again
              </Btn>
            )}
          </>
        ) : (
          <>
            <h1 className="text-lg font-bold tracking-tight">Waking the feeder service</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              The backend sleeps when idle on its free tier. The first load takes up to a minute —
              after that the feeder streams live at 2&nbsp;Hz.
            </p>

            <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-2xs text-ink-3">
              <span className="flex items-center gap-1.5">
                <span className="cc-pulse inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                Starting the container…
              </span>
              <span className="cc-mono tabular-nums">{elapsed}s</span>
            </div>

            {elapsed > 25 && (
              <p className="mt-4 text-2xs leading-relaxed text-ink-3">
                Still going. Nothing is broken — this is the hosting tier waking up, not the
                detection system. Everything you see afterwards is live.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
