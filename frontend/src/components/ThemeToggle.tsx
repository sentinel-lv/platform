import { useThemeCtx } from '../theme/ThemeContext';
import type { ThemePref } from '../theme/theme';

const OPTIONS: { v: ThemePref; label: string; glyph: string; hint: string }[] = [
  { v: 'light', label: 'Light', glyph: '☀', hint: 'Always light' },
  { v: 'system', label: 'Auto', glyph: '◐', hint: 'Follow the operating system' },
  { v: 'dark', label: 'Dark', glyph: '☾', hint: 'Always dark — the control-room default' },
];

/**
 * Three explicit states rather than a two-way switch. "Auto" has to be
 * selectable, not just the starting value, or a viewer who picks Dark can
 * never hand the choice back to their OS.
 */
export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { pref, setPref } = useThemeCtx();
  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="flex shrink-0 items-center gap-0.5 rounded-full border border-line bg-surface-2 p-0.5"
    >
      {OPTIONS.map((o) => {
        const active = pref === o.v;
        return (
          <button
            key={o.v}
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            title={o.hint}
            onClick={() => setPref(o.v)}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold transition ${
              active ? 'bg-surface-3 text-ink' : 'text-ink-3 hover:text-ink-2'
            }`}
          >
            <span aria-hidden="true" className="text-[12px] leading-none">{o.glyph}</span>
            {!compact && <span>{o.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
