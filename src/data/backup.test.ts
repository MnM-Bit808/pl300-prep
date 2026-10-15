import 'fake-indexeddb/auto';
import rawBank from '../../pl300-bank/questions/all_questions.json';
import { buildBank } from '@/bank/build';
import { MOCK_DRAFT_KEY, PROGRESS_KEY, ProgressStore } from '@/progress/store';
import { memoryStorage } from '@/storage/db';
import { WORKINGS_KEY, WorkingsStore } from '@/workings/store';
import { applyBackup, makeBackup, makeReportsExport, parseBackup, withoutId } from './backup';

const bank = buildBank(rawBank);
const KEYS = { progress: PROGRESS_KEY, workings: WORKINGS_KEY, mockDraft: MOCK_DRAFT_KEY };
const NOW = () => new Date('2026-10-15T09:00:00');

async function seeded() {
  const storage = memoryStorage();
  const progress = await ProgressStore.open(storage, NOW);
  const workings = await WorkingsStore.open(storage, NOW);
  progress.recordAnswer('PRE-001', { earned: 1, possible: 1 }, 'lesson');
  progress.recordAnswer('PRE-002', { earned: 0, possible: 1 }, 'practice');
  progress.finishLesson('prepare-1', ['PRE-001'], { completed: true, accuracy: 1, xp: 40 });
  workings.setQuestionNote('PRE-001', '**Import** for fast visuals');
  workings.setTopicNote('Get or connect to data', 'Gateways: personal vs standard');
  workings.toggleFlag('PRE-002');
  workings.addReport({ questionId: 'PRE-002', kind: 'unclear', details: 'Which table?' });
  await progress.flush();
  await workings.flush();
  return { storage, progress, workings };
}

describe('backup', () => {
  it('round-trips everything through export and import', async () => {
    const a = await seeded();
    const file = makeBackup({
      progress: a.progress.getSnapshot(),
      attempts: await a.progress.attempts(),
      workings: a.workings.getSnapshot(),
      mockDraft: null,
      settings: { theme: 'dark', textSize: 'large' },
    });
    const text = JSON.stringify(file);

    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.summary).toMatchObject({
      questionsAnswered: 2,
      attempts: 2,
      lessons: 1,
      notes: 2,
      flags: 1,
      reports: 1,
    });

    // A fresh device: apply, then open the stores from storage as the app would on reload.
    const storage = memoryStorage();
    const settings: Record<string, string> = {};
    await applyBackup(storage, parsed.backup, KEYS, (n, v) => (settings[n] = v));
    const progress = await ProgressStore.open(storage, NOW);
    const workings = await WorkingsStore.open(storage, NOW);

    expect(progress.getSnapshot()).toEqual(a.progress.getSnapshot());
    expect(workings.getSnapshot()).toEqual(a.workings.getSnapshot());
    expect((await progress.attempts()).map(withoutId)).toEqual(file.attempts);
    expect(settings).toEqual({ theme: 'dark', textSize: 'large' });
  });

  it('upgrades a backup made with older progress', async () => {
    const a = await seeded();
    const file = makeBackup({
      progress: a.progress.getSnapshot(),
      attempts: [],
      workings: a.workings.getSnapshot(),
      mockDraft: null,
      settings: {},
    });
    const v1 = {
      version: 1,
      xp: file.progress.xp,
      lessons: file.progress.lessons,
      questions: file.progress.questions,
    };
    const parsed = parseBackup(JSON.stringify({ ...file, progress: v1 }));
    expect(parsed.ok && parsed.backup.progress.version).toBe(4);
  });

  it('rejects files it can’t trust, with a plain reason', () => {
    expect(parseBackup('not json')).toEqual({ ok: false, error: 'This file isn’t valid JSON.' });
    expect(parseBackup('{"app":"something-else"}')).toMatchObject({
      ok: false,
      error: 'This isn’t a PL-300 Prep backup file.',
    });
    expect(parseBackup('{"app":"pl300-prep","kind":"reports"}')).toMatchObject({
      ok: false,
      error: expect.stringContaining('reports export'),
    });
    const bad = {
      app: 'pl300-prep',
      kind: 'backup',
      version: 1,
      exportedAt: 'x',
      progress: { version: 9 },
      attempts: [],
      workings: {},
    };
    expect(parseBackup(JSON.stringify(bad))).toMatchObject({
      ok: false,
      error: expect.stringContaining('progress'),
    });
  });

  it('exports reports with the question they are about', async () => {
    const { workings } = await seeded();
    const out = makeReportsExport(bank, workings.getSnapshot());
    expect(out.kind).toBe('reports');
    expect(out.reports[0]).toMatchObject({
      questionId: 'PRE-002',
      kind: 'unclear',
      kindLabel: 'The wording is unclear',
      details: 'Which table?',
      question: { topic: 'Get or connect to data' },
    });
  });
});

describe('reset', () => {
  it('clears progress and attempts but keeps notes, flags and reports', async () => {
    const { storage, progress, workings } = await seeded();
    await progress.reset();
    const again = await ProgressStore.open(storage, NOW);
    const notes = await WorkingsStore.open(storage, NOW);
    expect(again.getSnapshot().xp.total).toBe(0);
    expect(await again.attempts()).toEqual([]);
    expect(notes.getSnapshot()).toEqual(workings.getSnapshot());
  });
});
