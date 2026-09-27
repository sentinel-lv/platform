/** @type {import('tailwindcss').Config} */
// Colour lives in src/index.css as CSS custom properties (one source of truth).
// Tailwind only names them, so a token change never has to be made twice.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--cc-bg)',
        surface: {
          1: 'var(--cc-surface-1)',
          2: 'var(--cc-surface-2)',
          3: 'var(--cc-surface-3)',
        },
        line: { DEFAULT: 'var(--cc-line)', soft: 'var(--cc-line-soft)' },
        ink: {
          DEFAULT: 'var(--cc-text)',
          2: 'var(--cc-text-2)',
          3: 'var(--cc-text-3)',
        },
        good: { DEFAULT: 'var(--cc-good)', dim: 'var(--cc-good-dim)' },
        warning: { DEFAULT: 'var(--cc-warning)', dim: 'var(--cc-warning-dim)' },
        critical: { DEFAULT: 'var(--cc-critical)', dim: 'var(--cc-critical-dim)' },
        accent: { DEFAULT: 'var(--cc-accent)', dim: 'var(--cc-accent-dim)' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        // A deliberately short scale. Operator UIs go wrong by inventing sizes.
        '2xs': ['10px', { lineHeight: '14px', letterSpacing: '.06em' }],
        xs: ['11px', { lineHeight: '16px' }],
        sm: ['13px', { lineHeight: '18px' }],
        base: ['14px', { lineHeight: '20px' }],
        lg: ['16px', { lineHeight: '22px' }],
        // hero figure: >=48px, same sans as everything else, exactly one per view
        hero: ['56px', { lineHeight: '1', letterSpacing: '-.03em' }],
        display: ['34px', { lineHeight: '1.05', letterSpacing: '-.02em' }],
      },
      borderRadius: { panel: '10px' },
      boxShadow: {
        panel: '0 1px 2px rgba(0,0,0,.45)',
        lift: '0 8px 30px rgba(0,0,0,.55)',
      },
    },
  },
  plugins: [],
};
