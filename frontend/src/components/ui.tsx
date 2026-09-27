// Shared primitives. Every panel, button and meter in the console is built
// from these, so spacing and weight stay consistent under time pressure.
import type { ReactNode } from 'react';

/* ------------------------------------------------------------------ Panel */

export function Panel({
  title, right, children, className = '', bodyClassName = '', dense = false,
}: {
  title?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  dense?: boolean;
}) {
  return (
    <section
      className={`flex min-h-0 flex-col rounded-panel border border-line bg-surface-1 shadow-panel ${className}`}
    >
      {title && (
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-line-soft px-3 py-2">
          <h2 className="text-2xs font-bold uppercase tracking-[.14em] text-ink-3">{title}</h2>
          {right}
        </header>
      )}
      <div className={`min-h-0 flex-1 ${dense ? '' : 'p-3'} ${bodyClassName}`}>{children}</div>
    </section>
  );
}

/* ----------------------------------------------------------------- Button */

type BtnVariant = 'primary' | 'ghost' | 'quiet' | 'danger';

const BTN: Record<BtnVariant, string> = {
  primary: 'bg-accent text-white hover:brightness-110',
  ghost: 'border border-line bg-surface-2 text-ink-2 hover:border-ink-3 hover:text-ink',
  quiet: 'text-ink-3 hover:text-ink-2',
  danger: 'bg-critical text-white hover:brightness-110',
};

export function Btn({
  variant = 'ghost', className = '', children, ...rest
}: { variant?: BtnVariant } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`min-h-[40px] rounded px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-0 sm:px-2.5 sm:py-1.5 ${BTN[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ Meter */

/**
 * A ratio against a limit. The fill carries severity; the track is a dimmer
 * step of the same hue so the state reads across the whole bar, not just the
 * filled part.
 */
export function Meter({
  pct, tone, label, className = '',
}: { pct: number; tone: 'good' | 'warning' | 'critical'; label?: string; className?: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const fill = { good: 'bg-good', warning: 'bg-warning', critical: 'bg-critical' }[tone];
  const track = { good: 'bg-good-dim', warning: 'bg-warning-dim', critical: 'bg-critical-dim' }[tone];
  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full ${track} ${className}`}
      role="meter"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={`h-full rounded-full ${fill} transition-[width] duration-500`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

/* --------------------------------------------------------------- Stat tile */

export function Stat({
  label, value, unit, tone = 'default', hint, mono = true,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  tone?: 'default' | 'good' | 'warning' | 'critical' | 'accent';
  hint?: string;
  mono?: boolean;
}) {
  const toneCls = {
    default: 'text-ink', good: 'text-good', warning: 'text-warning',
    critical: 'text-critical', accent: 'text-accent',
  }[tone];
  return (
    <div
      className="flex shrink-0 snap-start flex-col justify-center gap-0.5 border-line px-3.5 py-2 sm:min-w-0 sm:shrink sm:border-r sm:last:border-r-0"
      title={hint}
    >
      <div className="truncate text-2xs font-semibold uppercase tracking-[.12em] text-ink-3">{label}</div>
      <div className={`flex items-baseline gap-1 ${toneCls}`}>
        <span className={`text-lg font-bold leading-none ${mono ? 'cc-mono tabular-nums' : ''}`}>{value}</span>
        {unit && <span className="text-2xs font-medium text-ink-3">{unit}</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Misc */

export function Dot({ className = '', pulse = false }: { className?: string; pulse?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${className} ${pulse ? 'cc-pulse' : ''}`}
    />
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-[72px] items-center justify-center px-4 py-6 text-center text-xs text-ink-3">
      {children}
    </div>
  );
}
