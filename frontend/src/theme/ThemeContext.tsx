import { createContext, useContext, type ReactNode } from 'react';
import { useTheme, type Resolved, type ThemePref } from './theme';

interface Ctx { pref: ThemePref; resolved: Resolved; setPref: (p: ThemePref) => void }

const ThemeCtx = createContext<Ctx>({ pref: 'system', resolved: 'dark', setPref: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const value = useTheme();
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

/** `resolved` is the value anything drawing literal colours should key off. */
export function useThemeCtx() {
  return useContext(ThemeCtx);
}
