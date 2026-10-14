import type { Bank } from '@/bank/load';
import type { MockRecord } from '@/progress/store';
import { hasInput } from '@/questions/answer';
import type { ExamState } from './exam';
import { scoreQuestions, summarise } from './score';

/** XP for a mock: 4 per mark (Paath's mock rate). */
export const XP_PER_MARK = 4;

/** Turns a submitted exam into its history record and the answers to file as attempts. */
export function toRecord(bank: Bank, s: ExamState) {
  const results = scoreQuestions(bank, s.sections, s.answers);
  const score = summarise(bank, results);
  const record: MockRecord = {
    id: s.id,
    startedAt: s.startedAt,
    submittedAt: s.submitted?.at ?? new Date().toISOString(),
    timedOut: s.submitted?.timedOut ?? false,
    caseId: s.sections.find((x) => x.kind === 'case')?.caseId ?? '',
    sections: s.sections,
    answers: s.answers,
    seeds: s.seeds,
    marked: s.marked,
    score,
    xp: Math.round(score.marks * XP_PER_MARK),
  };
  // Only questions you actually touched are attempts.
  const attempts = results
    .filter((r) => {
      const a = s.answers[r.questionId];
      return a !== undefined && hasInput(a);
    })
    .map((r) => ({ questionId: r.questionId, score: r.score }));
  return { record, attempts };
}
