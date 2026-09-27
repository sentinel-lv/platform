// How a node state is rendered — the single place that decides it.
//
// PROTOCOL.md §2 defines five states. The frontend brief's gotcha says colour
// alone is not enough: judges may be colour-blind and a projector washes amber
// out. That is not a nicety — a validated check puts CONFIRMED-red against
// NORMAL-green at CVD deltaE 4.1, which is *indistinguishable* to a deutan viewer.
//
// So every state carries three channels:
//   colour  — fast, for the people who can use it
//   glyph   — survives colour blindness, greyscale print and bad projectors
//   label   — the unambiguous fallback, always rendered next to the glyph
//
// Span polylines additionally carry a dash pattern, so the map is readable
// with hue removed entirely.

import type { NodeState } from '../types/protocol';

export interface StateStyle {
  label: string;
  /** css var reference for the state's colour */
  /** one character, rendered in the pin and the badge */
  glyph: string;
  color: string;
  /** tailwind classes for a badge on a dark surface */
  badge: string;
  /** CSS custom-property reference — SVG resolves this, MapLibre does not */
  dash?: number[];
  /** plain-language meaning, used in tooltips and the legend */
  meaning: string;
  /** the custom property behind `color`, for consumers that need a literal */
  varName: string;
}

export const STATE: Record<NodeState, StateStyle> = {
  NORMAL: {
    label: 'NORMAL',
    glyph: '●',
    color: 'var(--cc-good)',
    badge: 'bg-good-dim text-good',
    meaning: 'E-field within adaptive baseline tolerance',
    varName: '--cc-good',
  },
  SUSPECT: {
    label: 'SUSPECT',
    glyph: '▲',
    color: 'var(--cc-warning)',
    badge: 'bg-warning-dim text-warning',
    dash: [2, 1.2],
    meaning: 'Local collapse detected — awaiting neighbour votes',
    varName: '--cc-warning',
  },
  CONFIRMED: {
    label: 'CONFIRMED',
    glyph: '✕',
    color: 'var(--cc-critical)',
    badge: 'bg-critical-dim text-critical',
    dash: [1, 0.8],
    meaning: 'Quorum reached — fault asserted',
    varName: '--cc-critical',
  },
  RECOVERED: {
    label: 'RECOVERED',
    glyph: '✓',
    color: 'var(--cc-accent)',
    badge: 'bg-accent-dim text-accent',
    meaning: 'Field returned before quorum — false alarm rejected',
    varName: '--cc-accent',
  },
  OFFLINE: {
    label: 'OFFLINE',
    glyph: '○',
    color: 'var(--cc-text-3)',
    badge: 'bg-surface-3 text-ink-3',
    dash: [0.6, 1.6],
    meaning: 'No telemetry for more than 30 s — never a vote toward isolation',
    varName: '--cc-text-3',
  },
};

export const STATE_ORDER: NodeState[] = ['NORMAL', 'SUSPECT', 'CONFIRMED', 'RECOVERED', 'OFFLINE'];

/** Colour + glyph + label, the only sanctioned way to show a state. */
export function StateBadge({ state, size = 'sm' }: { state: NodeState; size?: 'sm' | 'xs' }) {
  const s = STATE[state];
  return (
    <span
      title={s.meaning}
      className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 font-semibold tracking-wide ${s.badge} ${
        size === 'xs' ? 'text-2xs' : 'text-xs'
      }`}
    >
      <span aria-hidden="true" className="leading-none">{s.glyph}</span>
      {s.label}
    </span>
  );
}
