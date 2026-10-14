/**
 * Display preferences (BUILD_PROMPT 4.8), kept in localStorage so they apply before the first
 * paint, and reflected as data attributes on <html> that the CSS reads:
 * - theme:    data-theme="light|dark" (absent = follow the device)
 * - textSize: data-text-size="large|larger" (absent = default); type tokens are in rem
 * - motion:   data-motion="reduce" (absent = follow the device)
 * Every storage call is wrapped: blocked storage means the choice lasts for the visit.
 */
import { useCallback, useState } from 'react';

export const PREFS = {
  theme: { key: 'pl300.theme', values: ['system', 'light', 'dark'], attr: 'data-theme' },
  textSize: {
    key: 'pl300.textSize',
    values: ['default', 'large', 'larger'],
    attr: 'data-text-size',
  },
  motion: { key: 'pl300.motion', values: ['system', 'reduce'], attr: 'data-motion' },
} as const;

export type PrefName = keyof typeof PREFS;
export type PrefValue<P extends PrefName> = (typeof PREFS)[P]['values'][number];
export type Prefs = { [P in PrefName]: PrefValue<P> };

const DEFAULTS: Prefs = { theme: 'system', textSize: 'default', motion: 'system' };

export function readPref<P extends PrefName>(name: P): PrefValue<P> {
  try {
    const v = localStorage.getItem(PREFS[name].key);
    return (PREFS[name].values as readonly string[]).includes(v ?? '')
      ? (v as PrefValue<P>)
      : DEFAULTS[name];
  } catch {
    return DEFAULTS[name];
  }
}

export const readPrefs = (): Prefs => ({
  theme: readPref('theme'),
  textSize: readPref('textSize'),
  motion: readPref('motion'),
});

export function applyPref<P extends PrefName>(name: P, value: PrefValue<P>) {
  const root = document.documentElement;
  if (value === DEFAULTS[name]) root.removeAttribute(PREFS[name].attr);
  else root.setAttribute(PREFS[name].attr, value);
}

export const applyPrefs = (p: Prefs = readPrefs()) =>
  (Object.keys(p) as PrefName[]).forEach((n) => applyPref(n, p[n] as never));

export function writePref<P extends PrefName>(name: P, value: PrefValue<P>) {
  applyPref(name, value);
  try {
    if (value === DEFAULTS[name]) localStorage.removeItem(PREFS[name].key);
    else localStorage.setItem(PREFS[name].key, value);
  } catch {
    /* storage unavailable: the choice lasts for this visit */
  }
}

/** For untrusted input (an imported backup): unknown names and values are ignored. */
export function writePrefIfValid(name: string, value: string) {
  if (!(name in PREFS)) return;
  const p = name as PrefName;
  if ((PREFS[p].values as readonly string[]).includes(value)) writePref(p, value as never);
}

export function usePref<P extends PrefName>(name: P) {
  const [value, setValue] = useState<PrefValue<P>>(() => readPref(name));
  const set = useCallback(
    (next: PrefValue<P>) => {
      setValue(next);
      writePref(name, next);
    },
    [name],
  );
  return [value, set] as const;
}

/** True when motion should be minimal: the device asks for it, or the setting does. */
export const prefersReducedMotion = () =>
  document.documentElement.getAttribute('data-motion') === 'reduce' ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
