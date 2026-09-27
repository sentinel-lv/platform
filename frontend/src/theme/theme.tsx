import { useEffect, useState } from 'react';

/**
 * Theme: dark (default), light, or follow the OS.
 *
 * The resolver always stamps a concrete `data-theme` of "dark" or "light" on
 * <html>, so CSS only ever needs two blocks instead of three overlapping
 * scopes. The stored preference — which may be "system" — is kept separately.
 *
 * A matching inline script in index.html applies the same stamp before first
 * paint, so a light-theme user never gets a black flash on load.
 */
export type ThemePref = 'dark' | 'light' | 'system';
export type Resolved = 'dark' | 'light';

const KEY = 'cc-theme';

export function systemTheme(): Resolved {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

export function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'dark' || v === 'light' || v === 'system') return v;
  } catch { /* private mode / blocked storage */ }
  return 'system';
}

export function applyTheme(pref: ThemePref): Resolved {
  const resolved: Resolved = pref === 'system' ? systemTheme() : pref;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  return resolved;
}

/** Preference, the resolved value, and a setter that persists. */
export function useTheme() {
  const [pref, setPrefState] = useState<ThemePref>(readPref);
  const [resolved, setResolved] = useState<Resolved>(() =>
    (typeof document !== 'undefined' && (document.documentElement.dataset.theme as Resolved)) || 'dark',
  );

  useEffect(() => { setResolved(applyTheme(pref)); }, [pref]);

  // Follow the OS live, but only while the preference actually is "system".
  useEffect(() => {
    if (pref !== 'system' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const on = () => setResolved(applyTheme('system'));
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [pref]);

  const setPref = (p: ThemePref) => {
    try { localStorage.setItem(KEY, p); } catch { /* ignore */ }
    setPrefState(p);
  };

  return { pref, resolved, setPref };
}

/**
 * The live value of a CSS custom property.
 *
 * MapLibre paint expressions and Recharts stroke props need literal colours,
 * and those colours change with the theme. Reading them back off the document
 * keeps index.css the single source of truth instead of maintaining a second
 * palette in TypeScript for every theme.
 */
export function cssVar(name: string, fallback = ''): string {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}
