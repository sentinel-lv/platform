/**
 * Shown while the console chunk loads and the socket comes up.
 *
 * Free-tier backends cold-start, so this can be on screen for several
 * seconds in front of a judge. It draws the feeder stroking itself into
 * existence rather than showing a spinner — the wait becomes the first frame
 * of the story instead of dead time.
 */
export default function BootScreen({ note = 'Connecting to feeder…' }: { note?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-bg px-6">
      <svg viewBox="0 0 320 90" className="w-full max-w-[320px]" aria-hidden="true">
        {/* the span, drawn left to right */}
        <line
          className="cc-boot-line"
          x1="20" y1="48" x2="300" y2="48"
          stroke="var(--cc-good)" strokeWidth="2.5" strokeLinecap="round"
        />
        {[20, 76, 132, 188, 244, 300].map((x, i) => (
          <g key={x}>
            <line x1={x} y1="48" x2={x} y2="72" stroke="var(--cc-line)" strokeWidth="2" />
            <circle
              className="cc-boot-node"
              cx={x} cy="48" r="5.5"
              fill="var(--cc-good)"
              style={{ animationDelay: `${0.35 + i * 0.13}s` }}
            />
          </g>
        ))}
        <rect x="4" y="38" width="14" height="20" rx="3"
          fill="var(--cc-surface-2)" stroke="var(--cc-accent)" strokeWidth="1.5" />
      </svg>

      <div className="flex items-center gap-2 text-xs text-ink-3">
        <span className="cc-pulse inline-block h-1.5 w-1.5 rounded-full bg-accent" />
        {note}
      </div>
    </div>
  );
}
