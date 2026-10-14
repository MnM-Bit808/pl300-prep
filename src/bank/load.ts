/**
 * Loads the bank once per session. The JSON is a separate chunk (dynamic import), so the app
 * shell paints before ~470 KB of questions arrive; images load lazily on their own.
 */
import type { CaseStudy, Question } from './schema';
import { validateBank, type BankIssue } from './validate';

export interface Bank {
  questions: readonly Question[];
  cases: readonly CaseStudy[];
  questionById: ReadonlyMap<string, Question>;
  caseById: ReadonlyMap<string, CaseStudy>;
  issues: readonly BankIssue[];
}

/** Public URL of a bank image path such as "images/model/MOD-001.svg". */
export const bankAssetUrl = (src: string) => `${import.meta.env.BASE_URL}bank/${src}`;

export function buildBank(raw: unknown): Bank {
  const { questions, cases, issues } = validateBank(raw);
  return {
    questions,
    cases,
    questionById: new Map(questions.map((q) => [q.id, q])),
    caseById: new Map(cases.map((c) => [c.id, c])),
    issues,
  };
}

function report(issues: readonly BankIssue[]) {
  if (!issues.length) return;
  const errors = issues.filter((i) => i.level === 'error');
  console.groupCollapsed(
    `[bank] ${errors.length} errors, ${issues.length - errors.length} warnings (bad questions are skipped)`,
  );
  for (const i of issues) (i.level === 'error' ? console.error : console.warn)(`${i.ref}: ${i.message}`);
  console.groupEnd();
}

let pending: Promise<Bank> | undefined;

export function loadBank(): Promise<Bank> {
  pending ??= import('../../pl300-bank/questions/all_questions.json').then((mod) => {
    const bank = buildBank(mod.default);
    report(bank.issues);
    return bank;
  });
  return pending;
}
