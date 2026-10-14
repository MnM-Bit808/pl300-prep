import { use, useEffect, useState, type ReactNode } from 'react';
import { memoryStorage } from '@/storage/db';
import { WorkingsStore } from '@/workings/store';
import { AppDataContext, openAppData, type AppData } from './hooks';
import type { ProgressStore } from './store';

/**
 * Suspends until saved data has loaded, then provides it. Wrap in <Suspense>.
 * Tests pass their own stores (workings defaults to an empty in-memory store).
 */
export function ProgressProvider({
  children,
  store,
  workings,
}: {
  children: ReactNode;
  store?: ProgressStore;
  workings?: WorkingsStore;
}) {
  const [injected] = useState<AppData | null>(() =>
    store
      ? {
          storage: memoryStorage(),
          progress: store,
          workings: workings ?? WorkingsStore.inMemory(),
        }
      : null,
  );
  const data = injected ?? use(openAppData());

  // Coming back to the tab after midnight rolls the day (daily XP, streak).
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && data.progress.refreshDay();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [data]);

  return <AppDataContext value={data}>{children}</AppDataContext>;
}
