import { createContext, use, useSyncExternalStore } from 'react';
import { openStorage } from '@/storage/db';
import { ProgressStore, type ProgressDoc } from './store';

export const StoreContext = createContext<ProgressStore | null>(null);

let opening: Promise<ProgressStore> | undefined;
/** Opens storage and the progress store once per page. */
export const openProgress = () => (opening ??= openStorage().then((s) => ProgressStore.open(s)));

export function useProgressStore(): ProgressStore {
  const store = use(StoreContext);
  if (!store) throw new Error('useProgressStore needs a <ProgressProvider>');
  return store;
}

/** The progress document; re-renders on every change. */
export function useProgress(): ProgressDoc {
  const store = useProgressStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
