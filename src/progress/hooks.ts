import { createContext, use, useEffect, useState, useSyncExternalStore } from 'react';
import { openStorage, type AttemptRecord, type Storage } from '@/storage/db';
import { WorkingsStore, type WorkingsDoc } from '@/workings/store';
import { ProgressStore, type ProgressDoc } from './store';

/** Everything the app keeps on this device, opened once per page from one storage. */
export interface AppData {
  storage: Storage;
  progress: ProgressStore;
  workings: WorkingsStore;
}

export const AppDataContext = createContext<AppData | null>(null);

let opening: Promise<AppData> | undefined;
export const openAppData = () =>
  (opening ??= openStorage().then(async (storage) => ({
    storage,
    progress: await ProgressStore.open(storage),
    workings: await WorkingsStore.open(storage),
  })));

export function useAppData(): AppData {
  const data = use(AppDataContext);
  if (!data) throw new Error('useAppData needs a <ProgressProvider>');
  return data;
}

export const useProgressStore = (): ProgressStore => useAppData().progress;
export const useWorkingsStore = (): WorkingsStore => useAppData().workings;

/** The progress document; re-renders on every change. */
export function useProgress(): ProgressDoc {
  const store = useProgressStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

/** Notes, flags and reports; re-renders on every change. */
export function useWorkings(): WorkingsDoc {
  const store = useWorkingsStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

/** The attempt log, re-read whenever progress changes; null while loading. */
export function useAttemptLog(): AttemptRecord[] | null {
  const store = useProgressStore();
  const doc = useProgress();
  const [log, setLog] = useState<AttemptRecord[] | null>(null);
  useEffect(() => {
    let live = true;
    store.attempts().then(
      (list) => live && setLog(list),
      () => live && setLog([]),
    );
    return () => {
      live = false;
    };
  }, [store, doc]);
  return log;
}
