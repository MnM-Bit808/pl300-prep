/**
 * One lesson run, as a pure reducer (rules from Paath):
 * - 5 hearts; a question that isn't fully correct costs one and comes back at the end.
 * - XP: 10 for a first-try answer, 5 when a returned question is answered, +10 for a lesson
 *   with no mistakes. XP is banked when the lesson ends, finished or out of hearts; quitting
 *   forfeits it.
 * - The lesson ends when every question has been answered correctly once, or hearts run out.
 */
export const MAX_HEARTS = 5;
export const XP_FIRST_TRY = 10;
export const XP_RETRY = 5;
export const XP_PERFECT_BONUS = 10;

export interface Session {
  /** Question ids in play order; wrong answers are appended again. */
  queue: string[];
  pos: number;
  total: number;
  hearts: number;
  xp: number;
  cleared: string[];
  /** Ids answered wrong at least once. */
  missed: string[];
  /** Result of the question on screen, once checked. */
  pending: 'right' | 'wrong' | null;
  status: 'active' | 'complete' | 'out-of-hearts';
}

export type SessionAction =
  { type: 'checked'; questionId: string; fullyCorrect: boolean } | { type: 'continue' };

export function startSession(questionIds: readonly string[], hearts = MAX_HEARTS): Session {
  return {
    queue: [...questionIds],
    pos: 0,
    total: questionIds.length,
    hearts,
    xp: 0,
    cleared: [],
    missed: [],
    pending: null,
    status: questionIds.length ? 'active' : 'complete',
  };
}

export const currentQuestion = (s: Session) => (s.status === 'active' ? s.queue[s.pos] : undefined);

export function sessionReducer(s: Session, action: SessionAction): Session {
  if (s.status !== 'active') return s;

  if (action.type === 'checked') {
    if (s.pending || action.questionId !== s.queue[s.pos]) return s;
    if (action.fullyCorrect) {
      const retry = s.missed.includes(action.questionId);
      return {
        ...s,
        pending: 'right',
        xp: s.xp + (retry ? XP_RETRY : XP_FIRST_TRY),
        cleared: [...s.cleared, action.questionId],
      };
    }
    return {
      ...s,
      pending: 'wrong',
      hearts: s.hearts - 1,
      missed: s.missed.includes(action.questionId) ? s.missed : [...s.missed, action.questionId],
      queue: [...s.queue, action.questionId],
    };
  }

  // continue
  if (!s.pending) return s;
  if (s.hearts <= 0) return { ...s, pending: null, status: 'out-of-hearts' };
  const pos = s.pos + 1;
  if (pos >= s.queue.length) {
    const perfect = s.missed.length === 0;
    return {
      ...s,
      pos,
      pending: null,
      status: 'complete',
      xp: s.xp + (perfect ? XP_PERFECT_BONUS : 0),
    };
  }
  return { ...s, pos, pending: null };
}

/** Share of the lesson's questions answered right the first time. */
export const firstTryAccuracy = (s: Session) =>
  s.total ? (s.total - s.missed.length) / s.total : 1;

/** Progress for the bar: questions cleared out of the lesson's questions. */
export const sessionProgress = (s: Session) => (s.total ? s.cleared.length / s.total : 1);
