/**
 * Daily quests: three small targets a day, chosen from the learner's own state so XP points at
 * what moves the exam score: reviews that are due (spaced repetition only works if they're
 * done), mistakes waiting to be fixed, the weakest or least practised domain, the next lesson.
 *
 * Quests are planned once a day and then fixed for that day. Progress is measured against
 * today's activity counters, which the store keeps as answers are recorded. Each quest pays
 * QUEST_XP once, the moment it's reached. Pure functions: the store and tests share them.
 */
import { ID_PREFIX, type Domain } from '@/bank/constants';

export type QuestKind = 'reviews' | 'fixes' | 'domain' | 'lesson' | 'answer';

export interface Quest {
  id: string;
  kind: QuestKind;
  target: number;
  /** For a domain quest: which domain. */
  domain?: Domain;
}

/** What happened today, counted as it happens. First tries only (retries don't count). */
export interface Activity {
  date: string;
  /** Questions answered. */
  answered: number;
  /** Answered in a review run. */
  reviews: number;
  /** Mistakes cleared: a queued mistake answered fully right. */
  fixes: number;
  /** Lessons finished. */
  lessons: number;
  /** Questions answered, per domain. */
  byDomain: Partial<Record<Domain, number>>;
}

export interface QuestDay {
  date: string;
  quests: Quest[];
  /** Quests already rewarded today. */
  done: string[];
}

export const QUEST_XP = 20;
export const QUESTS_PER_DAY = 3;

export const emptyActivity = (date = ''): Activity => ({
  date,
  answered: 0,
  reviews: 0,
  fixes: 0,
  lessons: 0,
  byDomain: {},
});

export const emptyQuestDay = (): QuestDay => ({ date: '', quests: [], done: [] });

/** Today's activity: a new day starts from zero. */
export const rollActivity = (a: Activity, today: string): Activity =>
  a.date === today ? a : emptyActivity(today);

const PREFIX_DOMAIN = new Map(
  (Object.entries(ID_PREFIX) as [Domain, string][]).map(([d, p]) => [p, d]),
);

/** A question's domain from its id ("MOD-040" → model). */
export const domainOfId = (id: string): Domain | undefined =>
  PREFIX_DOMAIN.get(id.split('-')[0] ?? '');

/** How far a quest has got today, capped at its target. */
export function questProgress(q: Quest, a: Activity): number {
  const n =
    q.kind === 'reviews'
      ? a.reviews
      : q.kind === 'fixes'
        ? a.fixes
        : q.kind === 'lesson'
          ? a.lessons
          : q.kind === 'domain'
            ? (a.byDomain[q.domain!] ?? 0)
            : a.answered;
  return Math.min(n, q.target);
}

/**
 * The domain to focus on: lowest accuracy among the exam domains with at least
 * MIN_FOCUS_ANSWERS answered, so one unlucky miss doesn't decide it. Null with too little to go
 * on. Case questions aren't a domain of their own here.
 */
export const MIN_FOCUS_ANSWERS = 3;
export function focusDomain(
  questions: Record<string, { attempts: number; correct: number }>,
): Domain | null {
  const tally = new Map<Domain, { attempts: number; correct: number }>();
  for (const [id, q] of Object.entries(questions)) {
    const d = domainOfId(id);
    if (!d || d === 'case') continue;
    const t = tally.get(d) ?? { attempts: 0, correct: 0 };
    t.attempts += q.attempts;
    t.correct += q.correct;
    tally.set(d, t);
  }
  let best: { d: Domain; acc: number } | null = null;
  for (const [d, t] of tally) {
    if (t.attempts < MIN_FOCUS_ANSWERS) continue;
    const acc = t.correct / t.attempts;
    if (!best || acc < best.acc) best = { d, acc };
  }
  return best?.d ?? null;
}

export interface QuestPlanInput {
  /** Reviews due today. */
  due: number;
  /** Mistakes in the queue. */
  mistakes: number;
  /** Weakest domain with enough answers, or null. */
  focus: Domain | null;
  /** The next lesson's domain, or null when every lesson is done. */
  nextLessonDomain: Domain | null;
}

/** Today's quests, most useful first. Always QUESTS_PER_DAY of them. */
export function planQuests(i: QuestPlanInput): Quest[] {
  const list: Quest[] = [];
  if (i.due > 0) list.push({ id: 'reviews', kind: 'reviews', target: Math.min(i.due, 10) });
  if (i.mistakes > 0) list.push({ id: 'fixes', kind: 'fixes', target: Math.min(i.mistakes, 3) });
  const d = i.focus ?? i.nextLessonDomain;
  if (d && d !== 'case') list.push({ id: `domain-${d}`, kind: 'domain', domain: d, target: 8 });
  if (i.nextLessonDomain) list.push({ id: 'lesson', kind: 'lesson', target: 1 });
  list.push({ id: 'answer', kind: 'answer', target: 15 });
  if (list.length < QUESTS_PER_DAY) list.push({ id: 'answer-more', kind: 'answer', target: 30 });
  return list.slice(0, QUESTS_PER_DAY);
}

/** Quests reached but not yet rewarded. */
export const newlyReached = (day: QuestDay, a: Activity): Quest[] =>
  day.quests.filter((q) => !day.done.includes(q.id) && questProgress(q, a) >= q.target);
