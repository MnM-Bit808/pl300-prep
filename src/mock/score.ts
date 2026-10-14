/**
 * Mock exam results. Points follow BUILD_PROMPT 4.1 (single and order all or nothing; multi,
 * yes/no and drop-down per part), and every question carries the same weight in the score:
 * each one is worth 1 mark, split across its parts.
 *
 * The score out of 1,000 is an estimate: the share of marks earned, scaled to 1,000. Microsoft
 * doesn't publish how it scales PL-300 scores, so the app says so wherever the number appears.
 */
import type { Bank } from '@/bank/load';
import { emptyAnswer, type Answer } from '@/questions/answer';
import { scoreAnswer, type Score } from '@/questions/scoring';
import { EXAM_DOMAINS, examDomain, PASS_MARK } from './build';

type ExamDomain = (typeof EXAM_DOMAINS)[number];

export interface QuestionResult {
  questionId: string;
  section: number;
  score: Score;
  /** 0–1: this question's share of its mark. */
  credit: number;
}

export interface MockScore {
  /** Marks earned out of the number of questions. */
  marks: number;
  total: number;
  scaled: number;
  passed: boolean;
  byDomain: Record<ExamDomain, { marks: number; total: number }>;
}

export function scoreQuestions(
  bank: Bank,
  sections: readonly { questionIds: readonly string[] }[],
  answers: Readonly<Record<string, Answer>>,
): QuestionResult[] {
  return sections.flatMap((s, section) =>
    s.questionIds.flatMap((id) => {
      const q = bank.questionById.get(id);
      if (!q) return []; // removed from the bank since: skipped quietly
      const answer = answers[id]?.type === q.type ? answers[id]! : emptyAnswer(q);
      const score = scoreAnswer(q, answer);
      return [
        {
          questionId: id,
          section,
          score,
          credit: score.possible ? score.earned / score.possible : 0,
        },
      ];
    }),
  );
}

export function summarise(bank: Bank, results: readonly QuestionResult[]): MockScore {
  const byDomain = Object.fromEntries(
    EXAM_DOMAINS.map((d) => [d, { marks: 0, total: 0 }]),
  ) as MockScore['byDomain'];
  let marks = 0;
  for (const r of results) {
    const q = bank.questionById.get(r.questionId)!;
    const d = byDomain[examDomain(q)];
    d.marks += r.credit;
    d.total += 1;
    marks += r.credit;
  }
  const total = results.length;
  const scaled = total ? Math.round((marks / total) * 1000) : 0;
  return { marks, total, scaled, passed: scaled >= PASS_MARK, byDomain };
}

export const fullyCorrect = (r: QuestionResult) => r.score.earned === r.score.possible;
