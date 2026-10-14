/** Turns raw bank JSON into the app's indexed, validated bank. Loaded with the questions. */
import type { Bank } from './load';
import { validateBank, type BankIssue } from './validate';

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

export function report(issues: readonly BankIssue[]) {
  if (!issues.length) return;
  const errors = issues.filter((i) => i.level === 'error');
  console.groupCollapsed(
    `[bank] ${errors.length} errors, ${issues.length - errors.length} warnings (bad questions are skipped)`,
  );
  for (const i of issues)
    (i.level === 'error' ? console.error : console.warn)(`${i.ref}: ${i.message}`);
  console.groupEnd();
}
