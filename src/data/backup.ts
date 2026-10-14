/**
 * One JSON file for everything you've done (BUILD_PROMPT 4.7): progress, the full attempt log,
 * notes, flags, reports, an exam in progress and display settings. Import validates the file,
 * upgrades older progress or workings shapes, and only then replaces what's on this device.
 *
 * Problem reports also export on their own, with enough of each question to fix it from.
 */
import { z } from '@/lib/zod';
import type { PrefName, Prefs } from '@/app/prefs';
import type { Bank } from '@/bank/load';
import type { ExamState } from '@/mock/exam';
import { localDay } from '@/progress/xp';
import { migrate, type ProgressDoc } from '@/progress/store';
import type { AttemptRecord, Storage } from '@/storage/db';
import { REPORT_KIND_LABEL, migrateWorkings, type WorkingsDoc } from '@/workings/store';

export const APP_ID = 'pl300-prep';
const BACKUP_VERSION = 1;

export interface Backup {
  app: typeof APP_ID;
  kind: 'backup';
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  progress: ProgressDoc;
  attempts: Omit<AttemptRecord, 'id'>[];
  workings: WorkingsDoc;
  mockDraft: ExamState | null;
  settings: Partial<Prefs>;
}

const AttemptSchema = z.object({
  questionId: z.string().min(1),
  at: z.string().min(1),
  earned: z.number().finite().min(0),
  possible: z.number().finite().min(0),
  mode: z.string(),
});

const EnvelopeSchema = z.object({
  app: z.literal(APP_ID),
  kind: z.literal('backup'),
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.string(),
  progress: z.unknown(),
  attempts: z.array(AttemptSchema),
  workings: z.unknown(),
  mockDraft: z.unknown().optional(),
  settings: z.record(z.string(), z.string()).optional(),
});

/** An attempt without its storage key (keys are re-issued on import). */
export const withoutId = (a: AttemptRecord): Omit<AttemptRecord, 'id'> => ({
  questionId: a.questionId,
  at: a.at,
  earned: a.earned,
  possible: a.possible,
  mode: a.mode,
});

export function makeBackup(input: {
  progress: ProgressDoc;
  attempts: readonly AttemptRecord[];
  workings: WorkingsDoc;
  mockDraft: ExamState | null;
  settings: Partial<Prefs>;
  now?: Date;
}): Backup {
  return {
    app: APP_ID,
    kind: 'backup',
    version: BACKUP_VERSION,
    exportedAt: (input.now ?? new Date()).toISOString(),
    progress: input.progress,
    attempts: input.attempts.map(withoutId),
    workings: input.workings,
    mockDraft: input.mockDraft,
    settings: input.settings,
  };
}

export interface BackupSummary {
  exportedAt: string;
  questionsAnswered: number;
  attempts: number;
  lessons: number;
  mocks: number;
  notes: number;
  flags: number;
  reports: number;
}

export type ParseResult =
  { ok: true; backup: Backup; summary: BackupSummary } | { ok: false; error: string };

/** Checks a file's text; never throws. Error messages say what's wrong in plain words. */
export function parseBackup(text: string, today = localDay()): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file isn’t valid JSON.' };
  }
  if (raw && typeof raw === 'object' && (raw as { kind?: string }).kind === 'reports') {
    return { ok: false, error: 'This is a reports export, not a backup. Choose a backup file.' };
  }
  const env = EnvelopeSchema.safeParse(raw);
  if (!env.success) return { ok: false, error: 'This isn’t a PL-300 Prep backup file.' };
  const progress = migrate(env.data.progress, today);
  if (!progress) return { ok: false, error: 'The progress in this backup couldn’t be read.' };
  const workings = migrateWorkings(env.data.workings);
  if (!workings) return { ok: false, error: 'The notes in this backup couldn’t be read.' };

  const draft = env.data.mockDraft as ExamState | null | undefined;
  const settings = (env.data.settings ?? {}) as Partial<Prefs>;
  const backup: Backup = {
    app: APP_ID,
    kind: 'backup',
    version: BACKUP_VERSION,
    exportedAt: env.data.exportedAt,
    progress,
    attempts: env.data.attempts,
    workings,
    mockDraft: draft && typeof draft === 'object' && Array.isArray(draft.sections) ? draft : null,
    settings,
  };
  return {
    ok: true,
    backup,
    summary: {
      exportedAt: backup.exportedAt,
      questionsAnswered: Object.keys(progress.questions).length,
      attempts: backup.attempts.length,
      lessons: Object.keys(progress.lessons).length,
      mocks: progress.mocks.length,
      notes: Object.keys(workings.questionNotes).length + Object.keys(workings.topicNotes).length,
      flags: Object.keys(workings.flags).length,
      reports: workings.reports.length,
    },
  };
}

/** Writes a checked backup to storage, replacing what was there. The caller reloads. */
export async function applyBackup(
  storage: Storage,
  backup: Backup,
  keys: { progress: string; workings: string; mockDraft: string },
  writeSetting: (name: PrefName, value: string) => void,
) {
  await storage.replaceAttempts(backup.attempts);
  await storage.set(keys.progress, backup.progress);
  await storage.set(keys.workings, backup.workings);
  await storage.set(keys.mockDraft, backup.mockDraft);
  for (const [name, value] of Object.entries(backup.settings)) {
    if (value) writeSetting(name as PrefName, value);
  }
}

/** Problem reports on their own, each with the question as it stood, ready to fix from. */
export function makeReportsExport(bank: Bank, workings: WorkingsDoc, now = new Date()) {
  return {
    app: APP_ID,
    kind: 'reports' as const,
    exportedAt: now.toISOString(),
    bank: { questions: bank.questions.length },
    reports: workings.reports.map((r) => {
      const q = bank.questionById.get(r.questionId);
      return {
        id: r.id,
        questionId: r.questionId,
        kind: r.kind,
        kindLabel: REPORT_KIND_LABEL[r.kind],
        details: r.details,
        at: r.at,
        question: q
          ? {
              topic: q.topic,
              subtopic: q.subtopic,
              type: q.type,
              stem: q.stem,
              image: q.image?.src ?? null,
            }
          : null,
      };
    }),
  };
}

/** Offers a JSON value to the browser as a file download. */
export function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const backupFilename = (kind: 'backup' | 'reports', day = localDay()) =>
  `${APP_ID}-${kind}-${day}.json`;
