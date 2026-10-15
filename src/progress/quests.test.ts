import { memoryStorage } from '@/storage/db';
import { reached } from './milestones';
import {
  domainOfId,
  emptyActivity,
  focusDomain,
  planQuests,
  questProgress,
  QUEST_XP,
  type Quest,
} from './quests';
import { ProgressStore } from './store';
import { addXp, emptyXp, FREEZE_EVERY, MAX_FREEZES, rollDay } from './xp';

const at = (iso: string) => () => new Date(iso);
const right = { earned: 1, possible: 1 };
const wrong = { earned: 0, possible: 1 };

describe('planning quests', () => {
  it('puts reviews, then mistakes, then the focus domain first', () => {
    const q = planQuests({ due: 14, mistakes: 2, focus: 'model', nextLessonDomain: 'prepare' });
    expect(q).toEqual([
      { id: 'reviews', kind: 'reviews', target: 10 },
      { id: 'fixes', kind: 'fixes', target: 2 },
      { id: 'domain-model', kind: 'domain', domain: 'model', target: 8 },
    ]);
  });

  it('gives a new learner a lesson, the next domain and a question count', () => {
    const q = planQuests({ due: 0, mistakes: 0, focus: null, nextLessonDomain: 'prepare' });
    expect(q.map((x) => x.id)).toEqual(['domain-prepare', 'lesson', 'answer']);
  });

  it('always plans three, even with every lesson done', () => {
    const q = planQuests({ due: 0, mistakes: 0, focus: null, nextLessonDomain: null });
    expect(q.map((x) => x.id)).toEqual(['answer', 'answer-more']);
    expect(planQuests({ due: 1, mistakes: 0, focus: null, nextLessonDomain: null })).toHaveLength(
      3,
    );
  });

  it('focuses on the weakest domain with enough answers to judge', () => {
    expect(
      focusDomain({
        'PRE-001': { attempts: 4, correct: 3 },
        'MOD-001': { attempts: 3, correct: 1 },
        'VIS-001': { attempts: 1, correct: 0 }, // too few to judge
        'CASE-001': { attempts: 9, correct: 0 }, // not an exam domain on its own
      }),
    ).toBe('model');
    expect(focusDomain({ 'PRE-001': { attempts: 2, correct: 0 } })).toBeNull();
    expect(domainOfId('MAN-007')).toBe('manage');
  });

  it('measures progress against today’s activity, capped at the target', () => {
    const a = { ...emptyActivity('2026-10-14'), reviews: 12, byDomain: { model: 3 } };
    const reviews: Quest = { id: 'reviews', kind: 'reviews', target: 10 };
    const model: Quest = { id: 'domain-model', kind: 'domain', domain: 'model', target: 8 };
    expect(questProgress(reviews, a)).toBe(10);
    expect(questProgress(model, a)).toBe(3);
  });
});

describe('quests in the store', () => {
  it('pays each quest once, when reached', async () => {
    const store = await ProgressStore.open(memoryStorage(), at('2026-10-14T09:00:00'));
    store.planQuests([{ id: 'answer', kind: 'answer', target: 2 }]);
    store.recordAnswer('PRE-001', right, 'practice');
    expect(store.getSnapshot().xp.total).toBe(0);
    store.recordAnswer('PRE-002', wrong, 'practice');
    expect(store.getSnapshot().quests.done).toEqual(['answer']);
    expect(store.getSnapshot().xp.total).toBe(QUEST_XP);
    store.recordAnswer('PRE-003', right, 'practice');
    expect(store.getSnapshot().xp.total).toBe(QUEST_XP); // not paid twice
  });

  it('counts a fix only when a queued mistake is answered right, and ignores retries', async () => {
    const store = await ProgressStore.open(memoryStorage(), at('2026-10-14T09:00:00'));
    store.recordAnswer('MOD-001', wrong, 'practice');
    store.recordAnswer('MOD-001', right, 'lesson', { retry: true });
    expect(store.getSnapshot().activity.fixes).toBe(0);
    store.recordAnswer('MOD-001', right, 'mistakes');
    const a = store.getSnapshot().activity;
    expect(a.fixes).toBe(1);
    expect(a.answered).toBe(2); // the retry isn't a first try
    expect(a.byDomain.model).toBe(2);
  });

  it('plans once a day and pays for what was already done that day', async () => {
    const store = await ProgressStore.open(memoryStorage(), at('2026-10-14T09:00:00'));
    store.recordAnswer('PRE-001', right, 'review');
    store.planQuests([{ id: 'reviews', kind: 'reviews', target: 1 }]);
    expect(store.getSnapshot().quests.done).toEqual(['reviews']);
    store.planQuests([{ id: 'answer', kind: 'answer', target: 1 }]); // same day: ignored
    expect(store.getSnapshot().quests.quests.map((q) => q.id)).toEqual(['reviews']);
  });

  it('counts finished lessons', async () => {
    const store = await ProgressStore.open(memoryStorage(), at('2026-10-14T09:00:00'));
    store.planQuests([{ id: 'lesson', kind: 'lesson', target: 1 }]);
    store.finishLesson('prepare-1', [], { completed: true, accuracy: 1, xp: 50 });
    expect(store.getSnapshot().xp.total).toBe(50 + QUEST_XP);
    expect(store.getSnapshot().milestones).toEqual({ 'first-lesson': '2026-10-14' });
  });
});

describe('streak freezes', () => {
  const goalDay = (s: ReturnType<typeof emptyXp>, day: string) => addXp(s, s.goal, day);

  it('earns one every five goal days, holding at most two', () => {
    let s = emptyXp();
    for (let i = 1; i <= FREEZE_EVERY; i++) s = goalDay(s, `2026-10-${String(i).padStart(2, '0')}`);
    expect(s.freezes).toBe(1);
    for (let i = 6; i <= 20; i++) s = goalDay(s, `2026-10-${String(i).padStart(2, '0')}`);
    expect(s.freezes).toBe(MAX_FREEZES);
  });

  it('counts a goal day once, however much more XP comes in', () => {
    let s = goalDay(emptyXp(), '2026-10-01');
    s = addXp(s, 100, '2026-10-01');
    expect(s.goalDays).toBe(1);
  });

  it('bridges missed days it can cover, and keeps the streak going', () => {
    let s = { ...addXp(emptyXp(), 10, '2026-10-01'), freezes: 2 };
    s = addXp(s, 10, '2026-10-02'); // a 2-day streak
    const rolled = rollDay(s, '2026-10-05'); // missed the 3rd and 4th
    expect(rolled.freezes).toBe(0);
    expect(rolled.frozeOn).toBe('2026-10-05');
    expect(rolled.streak).toEqual({ count: 2, last: '2026-10-04' });
    expect(addXp(rolled, 10, '2026-10-05').streak.count).toBe(3);
  });

  it('lets the streak go when the gap is longer than the freezes held', () => {
    let s = { ...addXp(emptyXp(), 10, '2026-10-01'), freezes: 1 };
    s = rollDay(s, '2026-10-05');
    expect(s.streak.count).toBe(0);
    expect(s.freezes).toBe(1); // not spent on a streak it couldn't save
  });
});

describe('milestones', () => {
  it('recognises what the input meets', () => {
    expect(
      reached({
        lessonsDone: 3,
        streak: 8,
        mockScores: [640, 712],
        unitsComplete: ['manage', 'case'],
        mastery: {
          model: { mastery: 0.85, seen: 90, total: 127 },
          prepare: { mastery: 0.9, seen: 20, total: 135 }, // not enough seen yet
        },
      }).sort(),
    ).toEqual(
      [
        'case-all',
        'first-lesson',
        'first-mock',
        'manage-steps',
        'model-mastery',
        'mock-pass',
        'streak-7',
      ].sort(),
    );
  });

  it('keeps a milestone once earned, with the day it was earned', async () => {
    const store = await ProgressStore.open(memoryStorage(), at('2026-10-14T09:00:00'));
    store.earnMilestones(['model-mastery']);
    store.earnMilestones(['model-mastery', 'first-mock']);
    expect(store.getSnapshot().milestones).toEqual({
      'model-mastery': '2026-10-14',
      'first-mock': '2026-10-14',
    });
  });
});
