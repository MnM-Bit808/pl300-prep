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

let pending: Promise<Bank> | undefined;

export function loadBank(): Promise<Bank> {
  // The questions and the code that validates them (with Zod) arrive together, off the main bundle.
  pending ??= Promise.all([
    import('../../pl300-bank/questions/all_questions.json'),
    import('./build'),
  ]).then(([mod, { buildBank, report }]) => {
    const bank = buildBank(mod.default);
    report(bank.issues);
    return bank;
  });
  return pending;
}
