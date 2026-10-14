/**
 * Which questions a practice run uses. Pure: the bank, progress and date go in, ids come out.
 *
 * - Custom practice: filter by domain, topic, subtopic and difficulty, then rank mistakes
 *   first, unseen next, then the rest (Paath's order), shuffled within each rank.
 * - Fix mistakes: the mistakes queue (missed on a first try, not yet put right), newest first.
 * - Review: spaced-repetition cards due today or earlier, most overdue and lowest box first.
 *
 * Ids missing from the bank (removed questions) are skipped quietly everywhere.
 */
import type { Bank } from '@/bank/load';
import type { Domain, Question } from '@/bank/schema';
import { shuffled } from '@/lib/random';
import { isDue } from '@/progress/srs';
import type { ProgressDoc } from '@/progress/store';

export interface PracticeFilter {
  domain?: Domain | undefined;
  topic?: string | undefined;
  subtopic?: string | undefined;
  /** Empty or missing means every difficulty. */
  difficulties?: readonly (1 | 2 | 3)[] | undefined;
}

export function filterQuestions(questions: readonly Question[], f: PracticeFilter): Question[] {
  return questions.filter(
    (q) =>
      (!f.domain || q.domain === f.domain) &&
      (!f.topic || q.topic === f.topic) &&
      (!f.subtopic || q.subtopic === f.subtopic) &&
      (!f.difficulties?.length || f.difficulties.includes(q.difficulty)),
  );
}

export const isMistake = (doc: ProgressDoc, id: string) => id in doc.mistakes;

/** Mistakes first, then never answered, then the rest; random within each group. */
export function rankForPractice(
  ids: readonly string[],
  doc: ProgressDoc,
  limit: number,
  random: () => number = Math.random,
): string[] {
  const rank = (id: string) => (isMistake(doc, id) ? 0 : doc.questions[id] ? 2 : 1);
  return shuffled(ids, random)
    .map((id, i) => ({ id, i, r: rank(id) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.id);
}

export function mistakeIds(bank: Bank, doc: ProgressDoc): string[] {
  return Object.entries(doc.mistakes)
    .filter(([id]) => bank.questionById.has(id))
    .sort((a, b) => b[1].localeCompare(a[1]))
    .map(([id]) => id);
}

export function dueIds(bank: Bank, doc: ProgressDoc, today: string): string[] {
  return Object.entries(doc.srs)
    .filter(([id, card]) => bank.questionById.has(id) && isDue(card, today))
    .sort((a, b) => a[1].due.localeCompare(b[1].due) || a[1].box - b[1].box)
    .map(([id]) => id);
}

/** Topics and subtopics in bank order, for the custom practice pickers. */
export function outline(questions: readonly Question[]) {
  const topics = new Map<
    string,
    { domain: Domain; subtopics: Map<string, number>; count: number }
  >();
  for (const q of questions) {
    let t = topics.get(q.topic);
    if (!t) topics.set(q.topic, (t = { domain: q.domain, subtopics: new Map(), count: 0 }));
    t.count += 1;
    t.subtopics.set(q.subtopic, (t.subtopics.get(q.subtopic) ?? 0) + 1);
  }
  return topics;
}
