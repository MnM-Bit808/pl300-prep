/**
 * Loads the bank once per session. The JSON is a separate chunk (dynamic import), so the app
 * shell paints before ~470 KB of questions arrive; images load lazily on their own.
 */
import type { CaseStudy, Question } from './schema';
import type { BankIssue } from './validate';

export interface Bank {
  questions: readonly Question[];
  cases: readonly CaseStudy[];
  questionById: ReadonlyMap<string, Question>;
  caseById: ReadonlyMap<string, CaseStudy>;
  issues: readonly BankIssue[];
}

/** Public URL of a bank image path such as "images/model/MOD-001.svg". */
export const bankAssetUrl = (src: string) => `${import.meta.env.BASE_URL}bank/${src}`;

/** A promise React's `use()` can read without suspending once it has settled. */
type Tracked<T> = Promise<T> & { status?: 'fulfilled'; value?: T };

let pending: Tracked<Bank> | undefined;

export function loadBank(): Promise<Bank> {
  if (pending) return pending;
  // The questions and the code that validates them (with Zod) arrive together, off the main bundle.
  const load: Tracked<Bank> = Promise.all([
    import('../../pl300-bank/questions/all_questions.json'),
    import('./build'),
  ]).then(([mod, { buildBank, report }]) => {
    const bank = buildBank(mod.default);
    report(bank.issues);
    // Marked as React expects, so later pages read the bank synchronously instead of showing
    // their loading fallback for a moment on every visit.
    load.status = 'fulfilled';
    load.value = bank;
    return bank;
  });
  pending = load;
  return load;
}
