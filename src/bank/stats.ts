import { DOMAINS, QUESTION_TYPES, type Domain, type QuestionType } from './constants';
import type { CaseStudy, Question } from './schema';

export interface BankStats {
  total: number;
  withImages: number;
  byDomain: Record<Domain, number>;
  byType: Record<QuestionType, number>;
  byDifficulty: Record<1 | 2 | 3, number>;
  cases: { id: string; title: string; tabs: string[]; questions: number }[];
}

const zeroes = <K extends string>(keys: readonly K[]) =>
  Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;

export function bankStats(questions: readonly Question[], cases: readonly CaseStudy[]): BankStats {
  const stats: BankStats = {
    total: questions.length,
    withImages: 0,
    byDomain: zeroes(DOMAINS),
    byType: zeroes(QUESTION_TYPES),
    byDifficulty: { 1: 0, 2: 0, 3: 0 },
    cases: cases.map((c) => ({
      id: c.id,
      title: c.title,
      tabs: c.tabs.map((t) => t.title),
      questions: 0,
    })),
  };
  const caseRow = new Map(stats.cases.map((c) => [c.id, c]));

  for (const q of questions) {
    stats.byDomain[q.domain] += 1;
    stats.byType[q.type] += 1;
    stats.byDifficulty[q.difficulty] += 1;
    if (q.image) stats.withImages += 1;
    if (q.caseId) {
      const row = caseRow.get(q.caseId);
      if (row) row.questions += 1;
    }
  }
  return stats;
}
