/**
 * The learner's answer to one question, and how the question is laid out for this attempt.
 *
 * Answers reference option and item ids, never screen positions, so shuffling never affects
 * scoring and stored attempts stay valid if the bank's option order changes.
 */
import { seededRandom, shuffled } from '@/lib/random';
import type { Question, QuestionType } from '@/bank/schema';

export type Answer =
  | { type: 'single'; choice: string | null }
  | { type: 'multi'; choices: string[] }
  | { type: 'yesno'; values: (boolean | null)[] }
  | { type: 'order'; sequence: string[] }
  | { type: 'dropdown'; picks: (number | null)[] };

export type AnswerOf<T extends QuestionType> = Extract<Answer, { type: T }>;

export function emptyAnswer(q: Question): Answer {
  switch (q.type) {
    case 'single':
      return { type: 'single', choice: null };
    case 'multi':
      return { type: 'multi', choices: [] };
    case 'yesno':
      return { type: 'yesno', values: q.statements.map(() => null) };
    case 'order':
      return { type: 'order', sequence: [] };
    case 'dropdown':
      return { type: 'dropdown', picks: q.parts.map(() => null) };
  }
}

/** True when the answer can be submitted. Order needs at least one placed item: the number of
 * steps is part of what's being tested, so the UI never reveals it. */
export function isComplete(q: Question, a: Answer): boolean {
  if (q.type !== a.type) return false;
  switch (a.type) {
    case 'single':
      return a.choice !== null;
    case 'multi':
      return q.type === 'multi' && a.choices.length === q.selectCount;
    case 'yesno':
      return a.values.every((v) => v !== null);
    case 'order':
      return a.sequence.length > 0;
    case 'dropdown':
      return a.picks.every((p) => p !== null);
  }
}

/** Display order of option/item ids for one attempt. Single and multi options and order items
 * are shuffled (order items are stored in answer order, so they must be). */
export interface Layout {
  order: string[];
}

export function layoutFor(q: Question, seed: number): Layout {
  const random = seededRandom(seed);
  switch (q.type) {
    case 'single':
    case 'multi':
      return {
        order: shuffled(
          q.options.map((o) => o.id),
          random,
        ),
      };
    case 'order':
      return {
        order: shuffled(
          q.items.map((i) => i.id),
          random,
        ),
      };
    case 'yesno':
    case 'dropdown':
      return { order: [] };
  }
}
