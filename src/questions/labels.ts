import type { Question } from '@/bank/schema';
import { verdictOf, type Score } from './scoring';

export const FORMAT_LABEL: Record<Question['type'], string> = {
  single: 'Single answer',
  multi: 'Multiple answers',
  yesno: 'Yes or no',
  order: 'Sequence',
  dropdown: 'Drop-down',
};

export const DIFFICULTY_LABEL = { 1: 'Recall', 2: 'Applied', 3: 'Exam-hard' } as const;

export function verdictText(score: Score): string {
  switch (verdictOf(score)) {
    case 'correct':
      return 'Correct';
    case 'partial':
      return `Partly correct: ${score.earned} of ${score.possible}`;
    case 'wrong':
      return score.possible > 1 ? `Not quite: 0 of ${score.possible}` : 'Not quite';
  }
}
