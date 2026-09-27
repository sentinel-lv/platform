import { Link, type Route } from '../router';
import ThemeToggle from './ThemeToggle';

/** Pull the console chunk down before the click, so navigation feels instant. */
const warmConsole = () => { void import('../pages/Console'); };

const LINKS: { to: Route; label: string }[] = [
  { to: '/', label: 'Overview' },
  { to: '/evidence', label: 'How it decides' },
];

/** Marketing-side header. The console has its own CommandBar instead. */
export default function SiteNav({ route }: { route: Route }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1120px] items-center gap-4 px-5 py-3">
        <Link to="/" className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 22 22" aria-hidden="true">
            <circle cx="11" cy="11" r="9.25" fill="none" stroke="var(--cc-accent)" strokeWidth="1.5" opacity=".45" />
            <path d="M2.5 11h5.2" stroke="var(--cc-good)" strokeWidth="2" strokeLinecap="round" />
            <path d="M14.3 11h5.2" stroke="var(--cc-critical)" strokeWidth="2" strokeLinecap="round" />
            <path d="M8.9 7.6 11 11l-1.1 1.3" fill="none" stroke="var(--cc-warning)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm font-bold tracking-tight">Closed-Circuit</span>
        </Link>

        <nav className="ml-2 flex items-center gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`rounded px-2.5 py-1.5 text-xs font-semibold transition ${
                route === l.to ? 'bg-surface-2 text-ink' : 'text-ink-3 hover:text-ink-2'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <ThemeToggle />
          <Link
          to="/console"
          onMouseEnter={warmConsole}
          onFocus={warmConsole}
          className="rounded bg-accent px-3.5 py-1.5 text-xs font-bold text-white transition hover:brightness-110"
        >
          Live console
          </Link>
        </div>
      </div>
    </header>
  );
}
