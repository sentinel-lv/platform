/**
 * The explainer loop on the landing page: a feeder, a break, the quorum, the
 * isolation. Pure CSS/SVG on one shared 9-second timeline, so it costs no
 * JavaScript and keeps running while the console warms the backend up.
 *
 * The numbers shown are representative of a real run, and the caption says so.
 * Nothing here is wired to the live stream — that is what /console is for.
 */

const POLES = [0, 1, 2, 3, 4, 5, 6];
const BREAK_AFTER = 2; // break sits between pole index 2 and 3
const X0 = 60;
const DX = 128;
const Y = 118;

export default function CascadeFilm() {
  return (
    <div className="relative w-full overflow-hidden rounded-panel border border-line bg-surface-1">
      <svg viewBox="0 0 900 200" className="w-full" role="img"
        aria-label="Animation: a conductor breaks, downstream nodes go SUSPECT, neighbours vote, quorum is reached and the span is isolated.">
        <defs>
          <linearGradient id="cf-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--cc-surface-2)" />
            <stop offset="100%" stopColor="var(--cc-bg)" />
          </linearGradient>
        </defs>

        <rect x="0" y="160" width="900" height="40" fill="url(#cf-ground)" />

        {/* conductor: healthy run, then the de-energised run that goes red */}
        <line x1={X0} y1={Y} x2={X0 + DX * BREAK_AFTER} y2={Y}
          stroke="var(--cc-good)" strokeWidth="3" strokeLinecap="round" />
        <line className="cf-downstream"
          x1={X0 + DX * (BREAK_AFTER + 1)} y1={Y} x2={X0 + DX * 6} y2={Y}
          strokeWidth="3" strokeLinecap="round" />

        {/* the span that breaks */}
        <line className="cf-span"
          x1={X0 + DX * BREAK_AFTER} y1={Y} x2={X0 + DX * (BREAK_AFTER + 1)} y2={Y}
          strokeWidth="3" strokeLinecap="round" />

        {/* the snapped end falling toward the ground */}
        <g className="cf-snap">
          <path d={`M${X0 + DX * BREAK_AFTER + 10} ${Y} q 26 26 40 42`}
            fill="none" stroke="var(--cc-critical)" strokeWidth="3" strokeLinecap="round" />
        </g>

        {/* vote arcs travelling upstream toward the gateway */}
        {[0, 1, 2].map((i) => (
          <path key={i} className={`cf-vote cf-vote-${i}`}
            d={`M${X0 + DX * (4 + i)} ${Y - 14} Q ${X0 + DX * (3 + i)} ${Y - 56} ${X0 + DX * (BREAK_AFTER + 1)} ${Y - 14}`}
            fill="none" stroke="var(--cc-warning)" strokeWidth="2" strokeLinecap="round" />
        ))}

        {POLES.map((i) => {
          const x = X0 + DX * i;
          const downstream = i > BREAK_AFTER;
          return (
            <g key={i}>
              <line x1={x} y1={Y} x2={x} y2="160" stroke="var(--cc-line)" strokeWidth="3" />
              <circle
                className={downstream ? `cf-node cf-node-${i - BREAK_AFTER - 1}` : 'cf-node-ok'}
                cx={x} cy={Y} r="9" strokeWidth="2.5" stroke="var(--cc-bg)"
              />
            </g>
          );
        })}

        {/* gateway at the feeder head */}
        <g>
          <rect x={X0 - 34} y={Y - 16} width="28" height="32" rx="4"
            fill="var(--cc-surface-2)" stroke="var(--cc-accent)" strokeWidth="2" />
          <text x={X0 - 20} y={Y + 5} textAnchor="middle"
            fill="var(--cc-accent)" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif">GW</text>
        </g>

        <text className="cf-verdict" x={X0 + DX * 3} y="42" textAnchor="middle"
          fontSize="19" fontWeight="800" fontFamily="Inter, sans-serif" fill="var(--cc-critical)">
          SPAN ISOLATED · 787 ms
        </text>
      </svg>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line-soft px-3 py-2 text-2xs text-ink-3">
        <span className="font-semibold uppercase tracking-[.12em] text-ink-2">How it decides</span>
        <span>field collapses downstream</span>
        <span aria-hidden="true">→</span>
        <span>neighbours vote</span>
        <span aria-hidden="true">→</span>
        <span>quorum reached</span>
        <span aria-hidden="true">→</span>
        <span>gateway isolates the span</span>
        <span className="ml-auto italic">illustrative loop · representative timing</span>
      </div>
    </div>
  );
}
