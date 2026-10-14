/** Theme preference: follow the system, or force light or dark. Applied as data-theme on <html>. */
import { useCallback, useState } from 'react';

export type ThemePref = 'system' | 'light' | 'dark';
const KEY = 'pl300.theme';

export function readTheme(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(pref: ThemePref) {
  const root = document.documentElement;
  if (pref === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', pref);
}

export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(readTheme);
  const set = useCallback((next: ThemePref) => {
    setPref(next);
    applyTheme(next);
    try {
      if (next === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      /* storage unavailable: the choice lasts for this visit */
    }
  }, []);
  return [pref, set] as const;
}
