import { STATE, STATE_ORDER } from '../theme/state';

/**
 * The colour key. Every state, its swatch, its glyph and what it actually
 * means — because "amber" tells an operator nothing on its own, and the
 * distinction that matters most (RECOVERED is a rejected false alarm, not a
 * problem) is invisible without the sentence.
 */
export default function StateKey({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-line-soft px-3 py-1.5">
        {STATE_ORDER.map((s) => (
          <span key={s} className="flex items-center gap-1 text-2xs text-ink-3" title={STATE[s].meaning}>
            <span aria-hidden="true" style={{ color: STATE[s].color }}>{STATE[s].glyph}</span>
            {STATE[s].label}
          </span>
        ))}
      </div>
    );
  }

  return (
    <dl className="space-y-2">
      {STATE_ORDER.map((s) => {
        const st = STATE[s];
        return (
          <div key={s} className="flex items-start gap-2.5">
            <span
              aria-hidden="true"
              className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
              style={{ background: st.color }}
            >
              {st.glyph}
            </span>
            <div className="min-w-0">
              <dt className="text-2xs font-bold uppercase tracking-[.1em]" style={{ color: st.color }}>
                {st.label}
              </dt>
              <dd className="text-2xs leading-snug text-ink-2">{st.meaning}</dd>
            </div>
          </div>
        );
      })}
    </dl>
  );
}
