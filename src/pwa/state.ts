/**
 * What the service worker has told us, as a tiny external store. register.ts (production only)
 * writes to it; the update prompt and Settings read it. Kept free of the PWA plugin's virtual
 * module so it's importable anywhere, tests included.
 */
import { useSyncExternalStore } from 'react';

export interface SwState {
  /** The app and every exhibit are cached: it works with no connection. */
  offlineReady: boolean;
  /** A new version is downloaded and waiting. */
  needRefresh: boolean;
  /** The "ready to work offline" note has been dismissed. */
  offlineNoted: boolean;
}

let state: SwState = { offlineReady: false, needRefresh: false, offlineNoted: false };
let applyUpdate: (() => Promise<void>) | undefined;
const listeners = new Set<() => void>();

export function setSwState(patch: Partial<SwState>) {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

export function setUpdater(fn: () => Promise<void>) {
  applyUpdate = fn;
}

/** Activates the waiting version and reloads. Progress is saved as you go, so this is safe. */
export const reloadToUpdate = () => applyUpdate?.();

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useSwState = () =>
  useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
