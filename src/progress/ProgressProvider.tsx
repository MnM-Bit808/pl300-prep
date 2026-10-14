import { use, useEffect, type ReactNode } from 'react';
import { openProgress, StoreContext } from './hooks';
import type { ProgressStore } from './store';

/** Suspends until progress has loaded, then provides it. Wrap in <Suspense>. Tests pass their
 * own store. */
export function ProgressProvider({
  children,
  store,
}: {
  children: ReactNode;
  store?: ProgressStore;
}) {
  const loaded = store ?? use(openProgress());

  // Coming back to the tab after midnight rolls the day (daily XP, streak).
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && loaded.refreshDay();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loaded]);

  return <StoreContext value={loaded}>{children}</StoreContext>;
}
