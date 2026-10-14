import { Suspense } from 'react';
import { BankReport } from '@/dev/BankReport';

/** Step 2 shell: only the bank diagnostics screen. Routing arrives with the first real screens. */
export function App() {
  return (
    <Suspense fallback={<p className="loading">Loading question bank…</p>}>
      <BankReport />
    </Suspense>
  );
}
