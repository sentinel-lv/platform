/**
 * The hero backdrop: the electric field around an energised conductor, drawn
 * as nested equipotential arcs that breathe at mains frequency, slowed to
 * something the eye can follow.
 *
 * It is the thing being measured, so it earns its place — this is not a
 * decorative gradient. Rendered at low opacity behind the headline and marked
 * aria-hidden.
 */
export default function FieldBackdrop() {
  const rings = [46, 74, 104, 136, 170, 206, 244];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* faint survey grid — a drawing board, not a dashboard */}
      <div
        className="absolute inset-0 opacity-[.35]"
        style={{
          backgroundImage:
            'linear-gradient(var(--cc-line-soft) 1px, transparent 1px),' +
            'linear-gradient(90deg, var(--cc-line-soft) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(120% 80% at 70% 30%, #000 25%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(120% 80% at 70% 30%, #000 25%, transparent 75%)',
        }}
      />

      <svg
        viewBox="0 0 520 520"
        className="absolute -right-24 -top-16 h-[560px] w-[560px] opacity-60 md:right-4 md:opacity-100"
      >
        {rings.map((r, i) => (
          <circle
            key={r}
            className="cc-field-ring"
            cx="260" cy="260" r={r}
            fill="none"
            stroke="var(--cc-accent)"
            strokeWidth={i === 0 ? 1.6 : 1}
            style={{ animationDelay: `${i * 0.26}s` }}
          />
        ))}
        {/* the conductor in cross-section, at the centre of its own field */}
        <circle cx="260" cy="260" r="7" fill="var(--cc-warning)" />
        <circle cx="260" cy="260" r="13" fill="none" stroke="var(--cc-warning)" strokeWidth="1.5" opacity=".5" />

        {/* the sense plate, standing off in the field */}
        <g transform="translate(260,260)">
          <rect x="150" y="-26" width="7" height="52" rx="2" fill="var(--cc-good)" opacity=".85" />
          <line x1="157" y1="0" x2="196" y2="0" stroke="var(--cc-good)" strokeWidth="1.4" opacity=".55" />
          <circle cx="204" cy="0" r="6" fill="none" stroke="var(--cc-good)" strokeWidth="1.4" opacity=".55" />
        </g>
      </svg>
    </div>
  );
}
