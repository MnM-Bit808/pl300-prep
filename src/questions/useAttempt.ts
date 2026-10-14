import { useCallback, useMemo, useState } from 'react';
import type { Question, QuestionType } from '@/bank/schema';
import { newSeed } from '@/lib/random';
import { emptyAnswer, isComplete, layoutFor, type AnswerOf } from './answer';
import { scoreAnswer, type Score } from './scoring';

export type Phase = 'answering' | 'revealed';

/** State for one attempt at one question: layout (shuffle), answer, check and retry. */
export function useAttempt(question: Question) {
  // One attempt per mounted question: callers key the component by question id.
  const [current, setState] = useState(() => ({
    seed: newSeed(),
    answer: emptyAnswer(question),
    phase: 'answering' as Phase,
  }));

  const layout = useMemo(() => layoutFor(question, current.seed), [question, current.seed]);
  const score: Score | null = useMemo(
    () => (current.phase === 'revealed' ? scoreAnswer(question, current.answer) : null),
    [question, current.phase, current.answer],
  );

  /** Renderers pass an updater, never a finished value, so taps that land before the next
   * render (fast double taps, quick adds) each apply to the latest answer instead of
   * overwriting one another. */
  const updateAnswer = useCallback(
    <T extends QuestionType>(update: (prev: AnswerOf<T>) => AnswerOf<T>) =>
      setState((s) =>
        s.phase === 'answering' ? { ...s, answer: update(s.answer as AnswerOf<T>) } : s,
      ),
    [],
  );
  const check = useCallback(() => setState((s) => ({ ...s, phase: 'revealed' })), []);
  const retry = useCallback(
    () =>
      setState((s) => ({
        ...s,
        seed: newSeed(),
        answer: emptyAnswer(question),
        phase: 'answering',
      })),
    [question],
  );

  return {
    answer: current.answer,
    layout,
    phase: current.phase,
    score,
    complete: isComplete(question, current.answer),
    updateAnswer,
    check,
    retry,
  };
}
