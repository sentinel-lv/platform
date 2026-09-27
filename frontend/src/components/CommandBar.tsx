import { useFeeder } from '../store/feederStore';
import { Link } from '../router';
import ThemeToggle from './ThemeToggle';
import { Dot } from './ui';

const LINK = {
  live: { dot: 'bg-good', text: 'LIVE', tone: 'text-good', hint: 'Streaming telemetry over WebSocket' },
  reconnecting: { dot: 'bg-warning', text: 'RECONNECTING', tone: 'text-warning', hint: 'Backend dropped — retrying with exponential backoff' },
  connecting: { dot: 'bg-ink-3', text: 'CONNECTING', tone: 'text-ink-3', hint: 'Waking the feeder service' },
} as const;

/** Brand mark: a conductor span with a break in it. */
function Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className="shrink-0">
      <circle cx="11" cy="11" r="9.25" fill="none" stroke="var(--cc-accent)" strokeWidth="1.5" opacity=".45" />
      <path d="M2.5 11h5.2" stroke="var(--cc-good)" strokeWidth="2" strokeLinecap="round" />
      <path d="M14.3 11h5.2" stroke="var(--cc-critical)" strokeWidth="2" strokeLinecap="round" />
      <path d="M8.9 7.6 11 11l-1.1 1.3" fill="none" stroke="var(--cc-warning)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function CommandBar() {
  const feederId = useFeeder((s) => s.feederId);
  const order = useFeeder((s) => s.order);
  const mode = useFeeder((s) => s.mode);
  const conn = useFeeder((s) => s.conn);
  const link = LINK[conn];

  return (
    <header className="relative z-20 shrink-0 border-b border-line bg-surface-1">
      {/* the live-link rule: a light travels it only while the stream is up */}
      <div className="absolute inset-x-0 bottom-0 h-px overflow-hidden bg-line">
        {conn === 'live' && <div className="cc-sweep absolute inset-0" />}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2 sm:px-4 sm:py-2.5">
        {/* The mark is the way back out of the console. Without it the only
            exit from a full-screen operator view was the browser's back
            button. */}
        <Link
          to="/"
          title="Back to the overview"
          className="group flex min-h-[40px] items-center gap-2 rounded transition hover:opacity-90 sm:min-h-0"
        >
          <Mark />
          <div className="leading-tight">
            <div className="flex items-center gap-1.5 text-sm font-bold tracking-tight">
              Closed-Circuit
              <span aria-hidden="true" className="text-2xs font-normal text-ink-3 opacity-0 transition group-hover:opacity-100">
                ← overview
              </span>
            </div>
            <div className="hidden text-2xs uppercase tracking-[.14em] text-ink-3 sm:block">LV conductor-break protection</div>
          </div>
        </Link>

        <div className="hidden h-7 w-px bg-line sm:block" />

        <dl className="cc-scroll order-3 flex min-w-0 flex-1 items-center gap-x-3 overflow-x-auto whitespace-nowrap text-xs sm:order-none sm:flex-none sm:gap-x-4 sm:overflow-visible">
          <div className="flex items-baseline gap-1.5">
            <dt className="text-2xs uppercase tracking-[.1em] text-ink-3">Feeder</dt>
            <dd className="cc-mono whitespace-nowrap font-semibold">{feederId}</dd>
          </div>
          <div className="hidden items-baseline gap-1.5 sm:flex">
            <dt className="text-2xs uppercase tracking-[.1em] text-ink-3">Nodes</dt>
            <dd className="cc-mono font-semibold tabular-nums">{order.length}</dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="whitespace-nowrap text-2xs uppercase tracking-[.1em] text-ink-3">Mode</dt>
            <dd
              className={`cc-mono font-semibold ${mode === 'AUTO' ? 'text-warning' : 'text-ink-2'}`}
              title={
                mode === 'AUTO'
                  ? 'Auto-isolation armed — the gateway may drive the relay'
                  : 'Default. The system alerts but never drives the relay; the utility opts into auto-isolation per feeder.'
              }
            >
              {mode}
            </dd>
          </div>
        </dl>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle compact />
          <span className={`flex items-center gap-1.5 text-2xs font-bold tracking-[.12em] ${link.tone}`} title={link.hint}>
            <Dot className={link.dot} pulse={conn !== 'live'} />
            {link.text}
          </span>

        </div>

        {/* Demo honesty (README §7): stated up front, never discovered.
            Sits on row 2 beside the feeder identity on a phone, so row 1 is
            just brand + link state. */}
        <span className="order-3 shrink-0 sm:order-none">
          <span
            className="whitespace-nowrap rounded border border-line bg-surface-2 px-2 py-1 text-2xs font-semibold text-ink-2"
            title="The feeder is simulated. The consensus engine, arbiter and latency numbers are real code running live."
          >
            <span className="sm:hidden">Simulated</span>
            <span className="hidden sm:inline">
              Simulated feeder<span className="mx-1.5 text-ink-3">·</span>live consensus engine
            </span>
          </span>
        </span>
      </div>
    </header>
  );
}
