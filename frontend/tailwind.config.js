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
        cyan: 'var(--cc-cyan)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        // A deliberately short scale. Operator UIs go wrong by inventing sizes.
        // Stepped up ~1px across the board: the original was tuned for a dense
        // console and read as too small everywhere else, especially on the
        // marketing pages and on a projector.
        '2xs': ['11px', { lineHeight: '15px', letterSpacing: '.05em' }],
        xs: ['12px', { lineHeight: '17px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['15px', { lineHeight: '23px' }],
        lg: ['17px', { lineHeight: '26px' }],
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
