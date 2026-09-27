import { Link, type Route } from '../router';
import ThemeToggle from './ThemeToggle';

/** Pull the console chunk down before the click, so navigation feels instant. */
const warmConsole = () => { void import('../pages/Console'); };

const LINKS: { to: Route; label: string }[] = [
  { to: '/', label: 'Overview' },
  { to: '/evidence', label: 'How it decides' },
  { to: '/team', label: 'Who built it' },
];

/** Marketing-side header. The console has its own CommandBar instead. */
export default function SiteNav({ route }: { route: Route }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg">
      {/* Wraps to two rows on a phone. With three links plus the theme
          control, a single nowrap row pushed the toggle off-screen and forced
          "Who built it" to break across three lines. */}
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-5 sm:py-3.5">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <circle cx="11" cy="11" r="9.25" fill="none" stroke="var(--cc-accent)" strokeWidth="1.5" opacity=".45" />
            <path d="M2.5 11h5.2" stroke="var(--cc-good)" strokeWidth="2" strokeLinecap="round" />
            <path d="M14.3 11h5.2" stroke="var(--cc-critical)" strokeWidth="2" strokeLinecap="round" />
            <path d="M8.9 7.6 11 11l-1.1 1.3" fill="none" stroke="var(--cc-warning)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="whitespace-nowrap text-[15px] font-bold tracking-tight">Closed-Circuit</span>
        </Link>

        <nav className="order-3 -mx-1 flex w-full items-center gap-1 overflow-x-auto px-1 sm:order-none sm:ml-2 sm:w-auto sm:overflow-visible">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`whitespace-nowrap rounded px-3 py-2 text-[13.5px] font-semibold transition ${
                route === l.to ? 'bg-surface-2 text-ink' : 'text-ink-3 hover:text-ink-2'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="hidden sm:block"><ThemeToggle /></span>
          <span className="sm:hidden"><ThemeToggle compact /></span>
          <Link
          to="/console"
          onMouseEnter={warmConsole}
          onFocus={warmConsole}
          className="whitespace-nowrap rounded bg-accent px-4 py-2 text-[13.5px] font-bold text-white transition hover:brightness-110"
        >
          Live console
          </Link>
        </div>
      </div>
    </header>
  );
}
