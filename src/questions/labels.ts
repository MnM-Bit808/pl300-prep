import type { Question } from '@/bank/schema';
import type { Answer } from './answer';
import { verdictOf, type Score } from './scoring';

export const FORMAT_LABEL: Record<Question['type'], string> = {
  single: 'Single answer',
  multi: 'Multiple answers',
  yesno: 'Yes or no',
  order: 'Sequence',
  dropdown: 'Drop-down',
};

export const DIFFICULTY_LABEL = { 1: 'Recall', 2: 'Applied', 3: 'Exam-hard' } as const;

/** How far through an answer you are, in words ("1 of 2 chosen"). */
export function progressText(q: Question, a: Answer): string {
  if (q.type === 'multi' && a.type === 'multi')
    return `${a.choices.length} of ${q.selectCount} chosen`;
  if (q.type === 'yesno' && a.type === 'yesno') {
    return `${a.values.filter((v) => v !== null).length} of ${q.statements.length} answered`;
  }
  if (q.type === 'dropdown' && a.type === 'dropdown') {
    return `${a.picks.filter((p) => p !== null).length} of ${q.parts.length} selected`;
  }
  if (q.type === 'order' && a.type === 'order') {
    return a.sequence.length === 1 ? '1 step placed' : `${a.sequence.length} steps placed`;
  }
  return a.type === 'single' && a.choice ? 'Answer chosen' : 'Choose an answer';
}

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
