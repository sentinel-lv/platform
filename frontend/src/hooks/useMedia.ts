import { useEffect, useState } from 'react';

/**
 * Subscribe to a media query.
 *
 * Used where a responsive change has to be a *render* decision rather than a
 * CSS one. The console renders the scenario panel either in the desktop rail
 * or in the mobile bottom sheet — hiding one copy with `lg:hidden` left both
 * in the DOM, which duplicated every data-testid and mounted the panel twice.
 */
export function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return matches;
}

/** Tailwind's `lg` breakpoint. */
export const useIsDesktop = () => useMedia('(min-width: 1024px)');
