/**
 * The learner's progress: one small document (XP, streak, lessons, per-question summary) plus
 * the attempt log in storage. Everything is keyed by question id, never by position, and ids no
 * longer in the bank are ignored by readers rather than deleted, so a bank update can't lose
 * history.
 *
 * The store is a tiny external store for React (subscribe / getSnapshot). Each change replaces
 * the snapshot immutably and is written through to storage in order.
 */
import type { MockSection } from '@/mock/build';
import type { ExamState } from '@/mock/exam';
import type { MockScore } from '@/mock/score';
import type { Answer } from '@/questions/answer';
import type { Storage } from '@/storage/db';
import { reached as milestonesReached } from './milestones';
import {
  domainOfId,
  emptyActivity,
  emptyQuestDay,
  newlyReached,
  QUEST_XP,
  rollActivity,
  type Activity,
  type Quest,
  type QuestDay,
} from './quests';
import { schedule, type SrsCard } from './srs';
import { addXp, emptyXp, localDay, rollDay, type XpState } from './xp';

export const PROGRESS_KEY = 'progress';
export const MOCK_DRAFT_KEY = 'mock.current';
const VERSION = 4;
/** Mock history kept (oldest dropped first). */
const MAX_MOCKS = 50;

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

/** A finished mock exam: enough to show history and rebuild the full review. */
export interface MockRecord {
  id: string;
  startedAt: string;
  submittedAt: string;
  timedOut: boolean;
  caseId: string;
  sections: MockSection[];
  answers: Record<string, Answer>;
  seeds: Record<string, number>;
  marked: string[];
  score: MockScore;
  xp: number;
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
  /** Finished mock exams, oldest first. */
  mocks: MockRecord[];
  /** Today's activity, which daily quests are measured against. */
  activity: Activity;
  /** Today's quests and which have paid out. */
  quests: QuestDay;
  /** Milestones earned: id → the day it was earned. */
  milestones: Record<string, string>;
}

export const emptyProgress = (): ProgressDoc => ({
  version: VERSION,
  xp: emptyXp(),
  lessons: {},
  questions: {},
  srs: {},
  mistakes: {},
  mocks: [],
  activity: emptyActivity(),
  quests: emptyQuestDay(),
  milestones: {},
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
    typeof d.mistakes === 'object' &&
    Array.isArray(d.mocks) &&
    typeof d.activity === 'object' &&
    Array.isArray(d.quests?.quests) &&
    typeof d.milestones === 'object'
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
  if (doc.version === 2) {
    // v3 adds mock exam history.
    doc = { ...doc, version: 3, mocks: [] };
  }
  if (doc.version === 3) {
    // v4 adds daily quests, streak freezes and milestones, all starting from nothing.
    const xp = doc.xp as XpState;
    doc = {
      ...doc,
      version: 4,
      xp: { ...xp, freezes: 0, goalDays: 0, frozeOn: '' },
      activity: emptyActivity(),
      quests: emptyQuestDay(),
      milestones: {},
    };
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
    /** The mock exam in progress, if any. Kept out of the document (and its subscribers): it
     * changes on every answer and only the exam screen reads it. */
    private draft: ExamState | null = null,
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
    const draft = await storage.get<ExamState>(MOCK_DRAFT_KEY).catch(() => undefined);
    return new ProgressStore(storage, doc ?? emptyProgress(), now, draft ?? null);
  }

  get persistent() {
    return this.storage.persistent;
  }

  getSnapshot = (): ProgressDoc => this.doc;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Today, by the store's clock. Pages ask here rather than the wall clock, so the whole app
   * (and a test's fixed clock) agrees on what day it is. */
  today = () => localDay(this.now());

  /**
   * Bring a changed document up to date with its own consequences: quests it has now reached
   * pay their XP (once), and milestones it now meets are recorded with today's date.
   */
  private settle(doc: ProgressDoc): ProgressDoc {
    const today = this.today();
    let next = doc;
    const activity = rollActivity(next.activity, today);
    if (next.quests.date === today) {
      const paid = newlyReached(next.quests, activity);
      if (paid.length) {
        next = {
          ...next,
          quests: { ...next.quests, done: [...next.quests.done, ...paid.map((q) => q.id)] },
          xp: addXp(next.xp, QUEST_XP * paid.length, today),
        };
      }
    }
    return withMilestones(
      next,
      milestonesReached({
        lessonsDone: Object.keys(next.lessons).length,
        streak: rollDay(next.xp, today).streak.count,
        mockScores: next.mocks.map((m) => m.score.scaled),
      }),
      today,
    );
  }

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

  /** The full attempt log, read after pending writes so the latest answers are included. */
  attempts = () => this.writes.then(() => this.storage.attempts());

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
    let activity = rollActivity(this.doc.activity, this.today());
    if (counts) {
      const domain = domainOfId(questionId);
      activity = {
        ...activity,
        answered: activity.answered + 1,
        reviews: activity.reviews + (mode === 'review' ? 1 : 0),
        fixes: activity.fixes + (fully && mistakes[questionId] ? 1 : 0),
        byDomain: domain
          ? { ...activity.byDomain, [domain]: (activity.byDomain[domain] ?? 0) + 1 }
          : activity.byDomain,
      };
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

    this.commit(
      this.settle({
        ...this.doc,
        srs,
        mistakes,
        activity,
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
      }),
    );
    this.writes = this.writes
      .then(() => this.storage.addAttempt({ questionId, at, mode, ...score }))
      .catch((e) => console.error('[progress] Could not log attempt', e));
  }

  /** The mock exam in progress (survives reloads), or null. */
  getMockDraft = (): ExamState | null => this.draft;

  saveMockDraft(state: ExamState | null) {
    this.draft = state;
    this.writes = this.writes
      .then(() => this.storage.set(MOCK_DRAFT_KEY, state))
      .catch((e) => console.error('[progress] Could not save the mock exam', e));
  }

  /**
   * File a finished mock: add it to the history, record every answered question like any
   * first try (so misses join the mistakes queue and reviews), bank its XP and clear the draft.
   * Unanswered questions aren't attempts and aren't recorded.
   */
  submitMock(record: MockRecord, results: readonly { questionId: string; score: ScoreLike }[]) {
    for (const r of results) this.recordAnswer(r.questionId, r.score, 'mock');
    this.commit(
      this.settle({
        ...this.doc,
        xp: addXp(this.doc.xp, record.xp, this.today()),
        mocks: [...this.doc.mocks, record].slice(-MAX_MOCKS),
      }),
    );
    this.saveMockDraft(null);
  }

  /** Bank XP from a practice or review run. */
  bankXp(xp: number) {
    if (xp > 0) this.commit(this.settle({ ...this.doc, xp: addXp(this.doc.xp, xp, this.today()) }));
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
      const activity = rollActivity(next.activity, today);
      next = {
        ...next,
        activity: { ...activity, lessons: activity.lessons + 1 },
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
    this.commit(this.settle(next));
  }

  /** Fix today's quests (once a day; the plan comes from the page that knows the course). */
  planQuests(quests: Quest[]) {
    const today = this.today();
    if (this.doc.quests.date === today) return;
    this.commit(this.settle({ ...this.doc, quests: { date: today, quests, done: [] } }));
  }

  /** Record milestones met (ones the document alone can't tell: course and mastery). */
  earnMilestones(ids: readonly string[]) {
    const next = withMilestones(this.doc, ids, this.today());
    if (next !== this.doc) this.commit(next);
  }

  setGoal(goal: number) {
    this.commit({ ...this.doc, xp: { ...this.doc.xp, goal } });
  }

  /** Roll the day over (call when the app regains focus after midnight). */
  refreshDay() {
    const rolled = rollDay(this.doc.xp, this.today());
    if (rolled !== this.doc.xp) this.commit({ ...this.doc, xp: rolled });
  }

  /**
   * Start progress again: the document, the attempt log and any exam in progress. Your notes,
   * flags and reports live in their own document and are untouched.
   */
  async reset() {
    await this.writes;
    await this.storage.replaceAttempts([]);
    this.saveMockDraft(null);
    this.commit(emptyProgress());
    await this.writes;
  }

  /** Replace everything with imported progress (attempts are written by the importer). */
  replace(doc: ProgressDoc, draft: ExamState | null) {
    this.commit(doc);
    this.saveMockDraft(draft);
  }
}

/** The document with any not-yet-earned milestones added, or the same document if none. */
function withMilestones(doc: ProgressDoc, ids: readonly string[], today: string): ProgressDoc {
  const fresh = ids.filter((id) => !doc.milestones[id]);
  if (!fresh.length) return doc;
  return {
    ...doc,
    milestones: { ...doc.milestones, ...Object.fromEntries(fresh.map((id) => [id, today])) },
  };
}
