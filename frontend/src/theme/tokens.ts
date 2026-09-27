// Hexes that JavaScript needs literally: MapLibre paint expressions and
// Recharts stroke props cannot read CSS custom properties.
//
// src/index.css is the source of truth. `assertTokensMatchCss()` runs in dev
// and shouts if these drift from it.

export const TOKENS = {
  bg: '#121211',
  surface1: '#1a1a19',
  surface2: '#212120',
  surface3: '#2b2b29',
  line: '#32322f',
  text: '#ffffff',
  text2: '#c3c2b7',
  text3: '#8b8a80',
  good: '#0ca30c',
  warning: '#fab219',
  critical: '#d03b3b',
  accent: '#3987e5',
} as const;

const CSS_VAR_OF: Record<keyof typeof TOKENS, string> = {
  bg: '--cc-bg',
  surface1: '--cc-surface-1',
  surface2: '--cc-surface-2',
  surface3: '--cc-surface-3',
  line: '--cc-line',
  text: '--cc-text',
  text2: '--cc-text-2',
  text3: '--cc-text-3',
  good: '--cc-good',
  warning: '--cc-warning',
  critical: '--cc-critical',
  accent: '--cc-accent',
};

/** Dev-only guard: the TS mirror must equal the CSS it mirrors. */
export function assertTokensMatchCss(): void {
  if (!import.meta.env.DEV || typeof window === 'undefined') return;
  const css = getComputedStyle(document.documentElement);
  for (const [key, cssVar] of Object.entries(CSS_VAR_OF)) {
    const fromCss = css.getPropertyValue(cssVar).trim().toLowerCase();
    const fromTs = TOKENS[key as keyof typeof TOKENS].toLowerCase();
    if (fromCss && fromCss !== fromTs) {
      // eslint-disable-next-line no-console
      console.warn(`[tokens] ${key}: index.css ${cssVar}=${fromCss} but tokens.ts=${fromTs}`);
    }
  }
}
