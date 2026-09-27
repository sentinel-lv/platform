import { useEffect, useRef, useState } from 'react';
import { MENTOR, TEAM, TRACK, type Person } from '../data/team';
import { Link } from '../router';

/** Monogram drawn as a sentinel node: a pole, a plate, and the field on it. */
function NodeMark({ person, accent }: { person: Person; accent: string }) {
  const initials = person.name.split(' ').map((w) => w[0]).slice(0, 2).join('');
  return (
    <svg viewBox="0 0 72 72" className="h-14 w-14 shrink-0" aria-hidden="true">
      <circle cx="36" cy="36" r="34" fill="none" stroke={accent} strokeWidth="1" opacity=".25" />
      <circle className="tm-ring" cx="36" cy="36" r="26" fill="none" stroke={accent} strokeWidth="1" opacity=".4" />
      <circle cx="36" cy="36" r="19" fill={accent} opacity=".14" />
      <text
        x="36" y="36" dy=".36em" textAnchor="middle"
        fill={accent} fontSize="19" fontWeight="800"
        fontFamily="Inter, sans-serif" letterSpacing="-.5"
      >
        {initials}
      </text>
    </svg>
  );
}

/**
 * A card that tilts toward the pointer. Cheap 3D: one perspective on the
 * container, a rotateX/rotateY on the card from the pointer's offset, and a
 * transform reset on leave. No library, no per-frame React state — the
 * transform is written straight to the element.
 */
function Card({ person, index }: { person: Person; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const track = TRACK[person.track];

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${px * 11}deg) rotateX(${-py * 11}deg) translateZ(12px)`;
  };
  const reset = () => {
    const el = ref.current;
    if (el) el.style.transform = '';
  };

  const inner = (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      className="tm-card group relative h-full rounded-panel border border-line bg-surface-1 p-5 transition-[transform,border-color,box-shadow] duration-200 hover:border-ink-3 hover:shadow-lift"
      style={{ animationDelay: `${index * 95}ms` }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[3px] rounded-t-panel"
        style={{ background: track.accent }}
      />

      <div className="flex items-start gap-4">
        <NodeMark person={person} accent={track.accent} />
        <div className="min-w-0 flex-1">
          <div
            className="text-2xs font-bold uppercase tracking-[.14em]"
            style={{ color: track.accent }}
          >
            {track.label}
          </div>
          <h3 className="mt-0.5 text-lg font-extrabold leading-tight tracking-[-.02em]">
            {person.name}
          </h3>
          {person.handle && (
            <div className="cc-mono mt-0.5 text-2xs text-ink-3 transition group-hover:text-accent">
              {person.handle} <span aria-hidden="true">↗</span>
            </div>
          )}
        </div>
      </div>

      <p className="mt-3.5 text-xs leading-relaxed text-ink-2">{person.owns}</p>
      <p className="mt-2 border-t border-line-soft pt-2 text-2xs text-ink-3">{track.remit}</p>
    </div>
  );

  return (
    <div className="tm-slot [perspective:1000px]">
      {person.href ? (
        <a
          href={person.href}
          target="_blank"
          rel="noopener noreferrer"
          className="block h-full rounded-panel"
          title={`Open ${person.name}'s site`}
        >
          {inner}
        </a>
      ) : (
        inner
      )}
    </div>
  );
}

export default function Team() {
  const [assembled, setAssembled] = useState(false);

  // Kick the assemble animation on mount, and let it be replayed — it is the
  // point of the page.
  useEffect(() => {
    const t = setTimeout(() => setAssembled(true), 40);
    return () => clearTimeout(t);
  }, []);

  const replay = () => {
    setAssembled(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setAssembled(true)));
  };

  return (
    <div className="mx-auto max-w-[1080px] px-5 py-14 md:py-20">
      <p className="text-2xs font-semibold uppercase tracking-[.16em] text-ink-3">
        Team VITBSIH26-388 · VIT Bhopal
      </p>

      <h1 className="mt-3 max-w-[16ch] text-[38px] font-extrabold leading-[1.04] tracking-[-.035em] md:text-[58px]">
        Six people,<br />
        <span className="text-accent">one frozen contract.</span>
      </h1>

      <p className="mt-5 max-w-[62ch] text-base leading-relaxed text-ink-2">
        A probe, a radio mesh, a relay and a dashboard are four different
        problems. They only add up to one system because everybody agreed on
        exactly what a message looks like before anyone wrote code — and then
        nobody changed it quietly.
      </p>

      <button
        onClick={replay}
        className="mt-6 rounded border border-line bg-surface-2 px-3.5 py-1.5 text-xs font-semibold text-ink-2 transition hover:border-accent hover:text-accent"
      >
        ⟳ Assemble
      </button>

      <div
        data-assembled={assembled}
        className="tm-grid mt-10 grid gap-4 sm:grid-cols-2"
      >
        {TEAM.map((p, i) => (
          <Card key={p.name} person={p} index={i} />
        ))}
      </div>

      <section className="mt-10 rounded-panel border border-line bg-surface-1 p-5">
        <div className="text-2xs font-bold uppercase tracking-[.14em] text-ink-3">Mentor</div>
        <h2 className="mt-1 text-lg font-bold tracking-tight">{MENTOR.name}</h2>
        <p className="mt-0.5 text-xs text-ink-2">{MENTOR.where}</p>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link to="/console" className="rounded bg-accent px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110">
          See what they built →
        </Link>
        <Link to="/" className="rounded border border-line bg-surface-2 px-5 py-2.5 text-sm font-semibold text-ink-2 transition hover:border-ink-3 hover:text-ink">
          Back to overview
        </Link>
      </div>
    </div>
  );
}
