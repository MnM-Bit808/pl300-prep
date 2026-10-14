import 'fake-indexeddb/auto';
import { memoryStorage, openStorage } from '@/storage/db';
import { PROGRESS_KEY, ProgressStore } from './store';
import { addXp, daysBetween, emptyXp, localDay, rollDay } from './xp';

describe('xp and streak', () => {
  it('starts, continues and breaks a streak by calendar day', () => {
    let s = addXp(emptyXp(), 10, '2026-10-01');
    expect(s.streak).toEqual({ count: 1, last: '2026-10-01' });
    s = addXp(s, 10, '2026-10-01');
    expect(s.streak.count).toBe(1);
    expect(s.daily).toEqual({ date: '2026-10-01', xp: 20 });
    s = addXp(s, 5, '2026-10-02');
    expect(s.streak.count).toBe(2);
    expect(s.daily.xp).toBe(5);
    // Skipping a day resets it: shown as 0 until XP is earned, then 1.
    expect(rollDay(s, '2026-10-04').streak.count).toBe(0);
    expect(addXp(s, 5, '2026-10-04').streak).toEqual({ count: 1, last: '2026-10-04' });
    expect(s.total).toBe(25);
  });

  it('crosses month and DST boundaries cleanly', () => {
    expect(daysBetween('2026-10-31', '2026-11-01')).toBe(1);
    expect(daysBetween('2026-03-28', '2026-03-29')).toBe(1);
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('earning nothing never starts a streak', () => {
    expect(addXp(emptyXp(), 0, '2026-10-01').streak.count).toBe(0);
  });
});

describe('ProgressStore', () => {
  const clock = (iso: string) => () => new Date(iso);

  it('records answers and lessons, and survives a reload from IndexedDB', async () => {
    const storage = await openStorage();
    expect(storage.persistent).toBe(true);
    const store = await ProgressStore.open(storage, clock('2026-10-14T09:00:00'));
    store.recordAnswer('PRE-001', { earned: 1, possible: 1 }, 'lesson');
    store.recordAnswer('PRE-001', { earned: 0, possible: 1 }, 'lesson');
    store.finishLesson('prepare-1', ['PRE-001'], { completed: true, accuracy: 0.8, xp: 90 });
    await store.flush();

    const again = await ProgressStore.open(await openStorage(), clock('2026-10-14T18:00:00'));
    const doc = again.getSnapshot();
    expect(doc.questions['PRE-001']).toMatchObject({ attempts: 2, correct: 1, lastEarned: 0 });
    expect(doc.lessons['prepare-1']).toMatchObject({ bestAccuracy: 0.8, completions: 1 });
    expect(doc.xp).toMatchObject({ total: 90, daily: { date: '2026-10-14', xp: 90 } });
    expect((await storage.attempts()).filter((a) => a.questionId === 'PRE-001')).toHaveLength(2);
    await again.reset();
  });

  it('keeps the best accuracy and banks XP from a failed run without completing it', async () => {
    const store = await ProgressStore.open(memoryStorage(), clock('2026-10-14T09:00:00'));
    store.finishLesson('l', [], { completed: true, accuracy: 0.9, xp: 10 });
    store.finishLesson('l', [], { completed: true, accuracy: 0.5, xp: 10 });
    store.finishLesson('m', [], { completed: false, accuracy: 0.2, xp: 15 });
    const doc = store.getSnapshot();
    expect(doc.lessons.l).toMatchObject({ bestAccuracy: 0.9, completions: 2 });
    expect(doc.lessons.m).toBeUndefined();
    expect(doc.xp.total).toBe(35);
  });

  it('notifies subscribers with a new snapshot', async () => {
    const store = await ProgressStore.open(memoryStorage());
    const before = store.getSnapshot();
    let calls = 0;
    store.subscribe(() => calls++);
    store.setGoal(100);
    expect(calls).toBe(1);
    expect(store.getSnapshot()).not.toBe(before);
    expect(store.getSnapshot().xp.goal).toBe(100);
  });

  it('backs up unrecognised saved data and starts clean', async () => {
    const storage = memoryStorage();
    await storage.set(PROGRESS_KEY, { version: 99, whatever: true });
    const store = await ProgressStore.open(storage);
    expect(store.getSnapshot().xp.total).toBe(0);
    expect(await storage.get(`${PROGRESS_KEY}.backup`)).toEqual({ version: 99, whatever: true });
  });
});
