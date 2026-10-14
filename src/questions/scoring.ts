/**
 * Scoring rules (BUILD_PROMPT 4.1):
 * - single, order: all or nothing (1 point).
 * - multi: 1 point per correct pick, out of selectCount.
 * - yesno, dropdown: 1 point per statement or part.
 */
import type { Question } from '@/bank/schema';
import type { Answer } from './answer';

export interface Score {
  earned: number;
  possible: number;
  /** Per-part marks, for feedback: multi = per pick (in pick order), yesno = per statement,
   * dropdown = per part, order = per placed slot, single = one entry. */
  parts: boolean[];
}

export const isFullyCorrect = (s: Score) => s.earned === s.possible;
export const verdictOf = (s: Score): 'correct' | 'partial' | 'wrong' =>
  isFullyCorrect(s) ? 'correct' : s.earned > 0 ? 'partial' : 'wrong';

export function scoreAnswer(q: Question, a: Answer): Score {
  if (q.type === 'single' && a.type === 'single') {
    const ok = a.choice === q.answer;
    return { earned: ok ? 1 : 0, possible: 1, parts: [ok] };
  }
  if (q.type === 'multi' && a.type === 'multi') {
    // Picks beyond selectCount never count; the UI stops them, this guards stored data.
    const parts = a.choices.slice(0, q.selectCount).map((id) => q.answer.includes(id));
    return { earned: parts.filter(Boolean).length, possible: q.selectCount, parts };
  }
  if (q.type === 'yesno' && a.type === 'yesno') {
    const parts = q.answer.map((expected, i) => a.values[i] === expected);
    return { earned: parts.filter(Boolean).length, possible: q.answer.length, parts };
  }
  if (q.type === 'order' && a.type === 'order') {
    const parts = a.sequence.map((id, i) => q.answer[i] === id);
    const exact = a.sequence.length === q.answer.length && parts.every(Boolean);
    return { earned: exact ? 1 : 0, possible: 1, parts };
  }
  if (q.type === 'dropdown' && a.type === 'dropdown') {
    const parts = q.answer.parts.map((expected, i) => a.picks[i] === expected);
    return { earned: parts.filter(Boolean).length, possible: q.answer.parts.length, parts };
  }
  throw new Error(`Answer of type ${a.type} does not fit question ${q.id} (${q.type})`);
}
