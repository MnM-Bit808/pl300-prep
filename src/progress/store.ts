/**
 * The learner's progress: one small document (XP, streak, lessons, per-question summary) plus
 * the attempt log in storage. Everything is keyed by question id, never by position, and ids no
 * longer in the bank are ignored by readers rather than deleted, so a bank update can't lose
 * history.
 *
 * The store is a tiny external store for React (subscribe / getSnapshot). Each change replaces
 * the snapshot immutably and is written through to storage in order.
 */
import type { Storage } from '@/storage/db';
import { schedule, type SrsCard } from './srs';
import { addXp, emptyXp, localDay, rollDay, type XpState } from './xp';

export const PROGRESS_KEY = 'progress';
const VERSION = 2;

export interface LessonRecord {
  bestAccuracy: number;
  completions: number;
  lastAt: string;
  /** The questions the lesson had when it was completed (lesson boundaries can move). */
  questionIds: string[];
}

export interface QuestionRecord {
  attempts: number;
  correct: number;
  /** Result of the latest attempt. */
  lastEarned: number;
  lastPossible: number;
  lastAt: string;
}

export interface ProgressDoc {
  version: typeof VERSION;
  xp: XpState;
  lessons: Record<string, LessonRecord>;
  questions: Record<string, QuestionRecord>;
  /** Spaced-repetition schedule per question (Leitner box and due day). */
  srs: Record<string, SrsCard>;
  /** The mistakes queue: question id → when it was last missed. */
  mistakes: Record<string, string>;
}

export const emptyProgress = (): ProgressDoc => ({
  version: VERSION,
  xp: emptyXp(),
  lessons: {},
  questions: {},
  srs: {},
  mistakes: {},
});

function isProgressDoc(v: unknown): v is ProgressDoc {
  if (!v || typeof v !== 'object') return false;
  const d = v as Partial<ProgressDoc>;
  return (
    d.version === VERSION &&
    typeof d.xp?.total === 'number' &&
    typeof d.lessons === 'object' &&
    typeof d.questions === 'object' &&
    typeof d.srs === 'object' &&
    typeof d.mistakes === 'object'
  );
}

/**
 * Upgrades older saved progress, one version at a time. Returns undefined for shapes it doesn't
 * know (the caller backs those up and starts clean).
 */
export function migrate(saved: unknown, today: string): ProgressDoc | undefined {
  if (!saved || typeof saved !== 'object') return undefined;
  let doc = saved as Record<string, unknown>;
  if (doc.version === 1) {
    // v2 adds spaced repetition and the mistakes queue. Everything answered so far is due today,
    // in box 2 if the last attempt was right; a wrong last attempt is a mistake to fix.
    const questions = (doc.questions ?? {}) as Record<string, QuestionRecord>;
    const srs: Record<string, SrsCard> = {};
    const mistakes: Record<string, string> = {};
    for (const [id, q] of Object.entries(questions)) {
      const right = q.lastEarned === q.lastPossible;
      srs[id] = { box: right ? 2 : 1, due: today };
      if (!right) mistakes[id] = q.lastAt;
    }
    doc = { ...doc, version: 2, srs, mistakes };
  }
  return isProgressDoc(doc) ? doc : undefined;
}

export interface ScoreLike {
  earned: number;
  possible: number;
}

export class ProgressStore {
  private doc: ProgressDoc;
  private listeners = new Set<() => void>();
  private writes: Promise<void> = Promise.resolve();

  private constructor(
    private storage: Storage,
    initial: ProgressDoc,
    private now: () => Date,
  ) {
    this.doc = { ...initial, xp: rollDay(initial.xp, localDay(now())) };
  }

  static async open(storage: Storage, now: () => Date = () => new Date()): Promise<ProgressStore> {
    const saved = await storage.get<unknown>(PROGRESS_KEY).catch(() => undefined);
    const doc = saved === undefined ? undefined : migrate(saved, localDay(now()));
    if (saved !== undefined && !doc) {
      // Unknown shape (future version or damage): keep a copy, start clean.
      console.warn('[progress] Saved progress not recognised; a backup was kept.');
      await storage.set(`${PROGRESS_KEY}.backup`, saved).catch(() => {});
    }
    return new ProgressStore(storage, doc ?? emptyProgress(), now);
  }

  get persistent() {
    return this.storage.persistent;
  }

  getSnapshot = (): ProgressDoc => this.doc;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private today = () => localDay(this.now());

  private commit(next: ProgressDoc) {
    this.doc = next;
    for (const l of this.listeners) l();
    const snapshot = next;
    this.writes = this.writes
      .then(() => this.storage.set(PROGRESS_KEY, snapshot))
      .catch((e) => console.error('[progress] Could not save', e));
  }

  /** Waits for pending writes (tests, export). */
  flush = () => this.writes;

  /**
   * Record one checked answer: always in the log and the question's summary; then, for a first
   * try only, in the review schedule and the mistakes queue.
   *
   * - `retry`: the question came back later in the same run after a miss. Getting it right then
   *   proves short-term memory, not learning, so it neither promotes the card nor clears the
   *   mistake: those wait for a first-try right answer in a later run.
   * - `schedule: false`: mock exams log answers without touching reviews or mistakes.
   */
  recordAnswer(
    questionId: string,
    score: ScoreLike,
    mode: string,
    { retry = false, schedule: scheduled = true }: { retry?: boolean; schedule?: boolean } = {},
  ) {
    const at = this.now().toISOString();
    const prev = this.doc.questions[questionId];
    const fully = score.earned === score.possible;
    const counts = scheduled && !retry;

    let { srs, mistakes } = this.doc;
    if (counts) {
      srs = { ...srs, [questionId]: schedule(srs[questionId], fully, this.today()) };
      if (fully) {
        if (mistakes[questionId]) {
          mistakes = { ...mistakes };
          delete mistakes[questionId];
        }
      } else {
        mistakes = { ...mistakes, [questionId]: at };
      }
    }

    this.commit({
      ...this.doc,
      srs,
      mistakes,
      questions: {
        ...this.doc.questions,
        [questionId]: {
          attempts: (prev?.attempts ?? 0) + 1,
          correct: (prev?.correct ?? 0) + (fully ? 1 : 0),
          lastEarned: score.earned,
          lastPossible: score.possible,
          lastAt: at,
        },
      },
    });
    this.writes = this.writes
      .then(() => this.storage.addAttempt({ questionId, at, mode, ...score }))
      .catch((e) => console.error('[progress] Could not log attempt', e));
  }

  /** Bank XP from a practice or review run. */
  bankXp(xp: number) {
    if (xp > 0) this.commit({ ...this.doc, xp: addXp(this.doc.xp, xp, this.today()) });
  }

  /** Bank a lesson run's XP; mark the lesson done when it was finished. */
  finishLesson(
    lessonId: string,
    questionIds: readonly string[],
    result: { completed: boolean; accuracy: number; xp: number },
  ) {
    const today = this.today();
    let next: ProgressDoc = { ...this.doc, xp: addXp(this.doc.xp, result.xp, today) };
    if (result.completed) {
      const prev = this.doc.lessons[lessonId];
      next = {
        ...next,
        lessons: {
          ...next.lessons,
          [lessonId]: {
            bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, result.accuracy),
            completions: (prev?.completions ?? 0) + 1,
            lastAt: this.now().toISOString(),
            questionIds: [...questionIds],
          },
        },
      };
    }
    this.commit(next);
  }

  setGoal(goal: number) {
    this.commit({ ...this.doc, xp: { ...this.doc.xp, goal } });
  }

  /** Roll the day over (call when the app regains focus after midnight). */
  refreshDay() {
    const rolled = rollDay(this.doc.xp, this.today());
    if (rolled !== this.doc.xp) this.commit({ ...this.doc, xp: rolled });
  }

  async reset() {
    await this.writes;
    await this.storage.clear();
    this.commit(emptyProgress());
  }
}
