import type { QuestionOf, QuestionType } from '@/bank/schema';
import type { AnswerOf, Layout } from '../answer';

export interface RendererProps<T extends QuestionType> {
  question: QuestionOf<T>;
  answer: AnswerOf<T>;
  layout: Layout;
  /** Apply a change to the latest answer (an updater, so rapid input is never lost). */
  onChange: (update: (prev: AnswerOf<T>) => AnswerOf<T>) => void;
  /** After checking: inputs lock and each part shows whether it was right. */
  revealed: boolean;
  /** Unique per rendered question, for input names and ids. */
  uid: string;
  /** Short status for screen readers and the check bar, e.g. "1 of 2 chosen". */
  onStatus?: (message: string) => void;
}

export const LETTERS = 'ABCDEFGHIJ';
