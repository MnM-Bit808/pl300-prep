import rawBank from '../../pl300-bank/questions/all_questions.json';
import { buildBank } from '@/bank/build';
import { seededRandom } from '@/lib/random';
import { addDays, isDue, schedule } from '@/progress/srs';
import {
  emptyProgress,
  migrate,
  ProgressStore,
  type ProgressDoc,
  type QuestionRecord,
} from '@/progress/store';
import { memoryStorage } from '@/storage/db';
import { dueIds, filterQuestions, mistakeIds, rankForPractice } from './select';

const bank = buildBank(rawBank);
const rec = (
  earned: number,
  possible: number,
  lastAt = '2026-10-14T10:00:00Z',
): QuestionRecord => ({
  attempts: 1,
  correct: earned === possible ? 1 : 0,
  lastEarned: earned,
  lastPossible: possible,
  lastAt,
});

describe('Leitner schedule', () => {
  const today = '2026-10-14';

  it('promotes on a right answer and resets on anything less', () => {
    const first = schedule(undefined, true, today);
    expect(first).toEqual({ box: 2, due: '2026-10-17' });
    const second = schedule(first, true, today);
    expect(second).toEqual({ box: 3, due: '2026-10-21' });
    expect(schedule(second, false, today)).toEqual({ box: 1, due: '2026-10-15' });
  });

  it('tops out at box 5 (30 days)', () => {
    let card = schedule(undefined, true, today);
    for (let i = 0; i < 10; i++) card = schedule(card, true, today);
    expect(card).toEqual({ box: 5, due: addDays(today, 30) });
  });

  it('is due on its day and after, not before', () => {
    expect(isDue({ box: 1, due: today }, today)).toBe(true);
    expect(isDue({ box: 1, due: '2026-10-01' }, today)).toBe(true);
    expect(isDue({ box: 1, due: '2026-10-15' }, today)).toBe(false);
  });

  it('adds days across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-02-27', 3)).toBe('2026-03-02');
  });
});

describe('migration v1 → v3', () => {
  it('schedules everything already answered for today', () => {
    const v1 = {
      version: 1,
      xp: { total: 40, goal: 50, daily: { date: '', xp: 0 }, streak: { count: 0, last: '' } },
      lessons: {},
      questions: { 'PRE-001': rec(1, 1), 'PRE-002': rec(0, 1) },
    };
    const doc = migrate(v1, '2026-10-14')!;
    expect(doc.version).toBe(3);
    expect(doc.mocks).toEqual([]);
    expect(doc.srs).toEqual({
      'PRE-001': { box: 2, due: '2026-10-14' },
      'PRE-002': { box: 1, due: '2026-10-14' },
    });
    expect(Object.keys(doc.mistakes)).toEqual(['PRE-002']);
    expect(doc.xp.total).toBe(40);
  });

  it('rejects shapes it does not know', () => {
    expect(migrate({ version: 7 }, '2026-10-14')).toBeUndefined();
    expect(migrate('nope', '2026-10-14')).toBeUndefined();
  });
});

describe('practice selection', () => {
  it('filters by domain, topic, subtopic and difficulty', () => {
    const model = filterQuestions(bank.questions, { domain: 'model' });
    expect(model).toHaveLength(120);
    const dax = filterQuestions(bank.questions, {
      domain: 'model',
      topic: 'Create model calculations by using DAX',
      difficulties: [3],
    });
    expect(dax.length).toBeGreaterThan(0);
    expect(dax.every((q) => q.difficulty === 3 && q.topic.includes('DAX'))).toBe(true);
  });

  it('ranks mistakes first, then unseen, then the rest', () => {
    const doc: ProgressDoc = {
      ...emptyProgress(),
      questions: { a: rec(1, 1), b: rec(0, 1), c: rec(1, 2) },
      mistakes: { b: '2026-10-14T10:00:00Z', c: '2026-10-14T10:00:00Z' },
    };
    const ranked = rankForPractice(['a', 'b', 'c', 'd', 'e'], doc, 5, seededRandom(1));
    expect(new Set(ranked.slice(0, 2))).toEqual(new Set(['b', 'c']));
    expect(new Set(ranked.slice(2, 4))).toEqual(new Set(['d', 'e']));
    expect(ranked[4]).toBe('a');
    expect(rankForPractice(['a', 'b', 'c', 'd', 'e'], doc, 3, seededRandom(1))).toHaveLength(3);
  });

  it('lists mistakes newest first and skips ids no longer in the bank', () => {
    const doc: ProgressDoc = {
      ...emptyProgress(),
      mistakes: {
        'PRE-001': '2026-10-10T10:00:00Z',
        'MOD-040': '2026-10-12T10:00:00Z',
        'GONE-999': '2026-10-13T10:00:00Z',
      },
    };
    expect(mistakeIds(bank, doc)).toEqual(['MOD-040', 'PRE-001']);
  });

  it('lists due reviews, most overdue first', () => {
    const doc: ProgressDoc = {
      ...emptyProgress(),
      srs: {
        'PRE-001': { box: 2, due: '2026-10-14' },
        'PRE-002': { box: 1, due: '2026-10-10' },
        'PRE-003': { box: 1, due: '2026-10-20' },
        'GONE-999': { box: 1, due: '2026-10-01' },
      },
    };
    expect(dueIds(bank, doc, '2026-10-14')).toEqual(['PRE-002', 'PRE-001']);
  });
});

describe('retry rule', () => {
  const NOW = () => new Date('2026-10-14T09:00:00');

  it('a miss queues a mistake; a same-run retry neither clears it nor promotes the card', async () => {
    const store = await ProgressStore.open(memoryStorage(), NOW);
    store.recordAnswer('PRE-001', { earned: 0, possible: 1 }, 'lesson');
    store.recordAnswer('PRE-001', { earned: 1, possible: 1 }, 'lesson', { retry: true });
    const doc = store.getSnapshot();
    expect(doc.mistakes).toHaveProperty('PRE-001');
    expect(doc.srs['PRE-001']).toEqual({ box: 1, due: '2026-10-15' });
    // The retry is still logged in the question's history.
    expect(doc.questions['PRE-001']).toMatchObject({ attempts: 2, correct: 1 });
  });

  it('a first-try right answer in a later run clears the mistake and promotes the card', async () => {
    const store = await ProgressStore.open(memoryStorage(), NOW);
    store.recordAnswer('PRE-001', { earned: 0, possible: 1 }, 'lesson');
    store.recordAnswer('PRE-001', { earned: 1, possible: 1 }, 'mistakes');
    expect(store.getSnapshot().mistakes).not.toHaveProperty('PRE-001');
    expect(store.getSnapshot().srs['PRE-001']).toEqual({ box: 2, due: '2026-10-17' });
  });

  it('partial credit counts as a miss', async () => {
    const store = await ProgressStore.open(memoryStorage(), NOW);
    store.recordAnswer('MOD-040', { earned: 1, possible: 2 }, 'practice');
    expect(store.getSnapshot().mistakes).toHaveProperty('MOD-040');
  });

  it('mock exams log answers without touching reviews or mistakes', async () => {
    const store = await ProgressStore.open(memoryStorage(), NOW);
    store.recordAnswer('PRE-001', { earned: 0, possible: 1 }, 'mock', { schedule: false });
    expect(store.getSnapshot().mistakes).toEqual({});
    expect(store.getSnapshot().srs).toEqual({});
    expect(store.getSnapshot().questions['PRE-001']?.attempts).toBe(1);
  });
});
