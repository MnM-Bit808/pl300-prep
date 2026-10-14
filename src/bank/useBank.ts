import { use } from 'react';
import { loadBank, type Bank } from './load';

/** Suspends until the bank has loaded; wrap callers in <Suspense>. */
export const useBank = (): Bank => use(loadBank());
