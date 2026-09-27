import { useEffect, useState } from 'react';

/**
 * Hash routing in ~30 lines rather than a router dependency.
 *
 * The frontend brief says not to add libraries that need configuration work,
 * and hash routes have a practical advantage for this project: they work on
 * any static host with zero rewrite rules, so a Vercel deploy cannot 404 on a
 * deep link the night before a demo.
 */
export type Route = '/' | '/console' | '/evidence' | '/nodes' | '/team';

const ROUTES: Route[] = ['/', '/console', '/evidence', '/nodes', '/team'];

function read(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  return (ROUTES as string[]).includes(raw) ? (raw as Route) : '/';
}

/** A deep link should say where it goes in the tab and in a bookmark. */
const TITLE: Record<Route, string> = {
  '/': 'Closed-Circuit — LV conductor-break protection',
  '/evidence': 'How it decides — Closed-Circuit',
  '/console': 'Operator console — Closed-Circuit',
  '/nodes': 'All nodes — Closed-Circuit',
  '/team': 'Who built it — Closed-Circuit',
};

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(read);
  useEffect(() => {
    const on = () => {
      const next = read();
      setRoute(next);
      document.title = TITLE[next];
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    document.title = TITLE[read()];
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function navigate(to: Route) {
  window.location.hash = to;
}

/** An anchor, so it keeps middle-click, copy-link and keyboard behaviour. */
export function Link({
  to, className = '', children, ...rest
}: { to: Route } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a href={`#${to}`} className={className} {...rest}>
      {children}
    </a>
  );
}
