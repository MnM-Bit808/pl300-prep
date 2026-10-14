/**
 * My workings (BUILD_PROMPT 4.7): your notes on questions and topics, flags, and problem
 * reports. A separate document from progress, so resetting progress can keep your notes.
 * Keyed by question id and topic name; ids no longer in the bank are kept but not shown.
 */
import { memoryStorage, type Storage } from '@/storage/db';

export const WORKINGS_KEY = 'workings';
const VERSION = 1;

export interface Note {
  text: string;
  updatedAt: string;
}

export const REPORT_KINDS = ['wrong-answer', 'unclear', 'image', 'other'] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

export const REPORT_KIND_LABEL: Record<ReportKind, string> = {
  'wrong-answer': 'The marked answer looks wrong',
  unclear: 'The wording is unclear',
  image: 'The exhibit has a problem',
  other: 'Something else',
};

export interface Report {
  id: string;
  questionId: string;
  kind: ReportKind;
  details: string;
  at: string;
}

export interface WorkingsDoc {
  version: typeof VERSION;
  questionNotes: Record<string, Note>;
  /** Keyed by the bank's topic name. */
  topicNotes: Record<string, Note>;
  /** Question id → when it was flagged. */
  flags: Record<string, string>;
  reports: Report[];
}

export const emptyWorkings = (): WorkingsDoc => ({
  version: VERSION,
  questionNotes: {},
  topicNotes: {},
  flags: {},
  reports: [],
});

/** Accepts saved or imported workings, upgrading older shapes; undefined if unrecognised. */
export function migrateWorkings(saved: unknown): WorkingsDoc | undefined {
  if (!saved || typeof saved !== 'object') return undefined;
  const d = saved as Partial<WorkingsDoc>;
  const ok =
    d.version === VERSION &&
    typeof d.questionNotes === 'object' &&
    typeof d.topicNotes === 'object' &&
    typeof d.flags === 'object' &&
    Array.isArray(d.reports);
  return ok ? (d as WorkingsDoc) : undefined;
}

const withNote = (map: Record<string, Note>, key: string, text: string, at: string) => {
  const next = { ...map };
  if (text.trim()) next[key] = { text, updatedAt: at };
  else delete next[key];
  return next;
};

export class WorkingsStore {
  private doc: WorkingsDoc;
  private listeners = new Set<() => void>();
  private writes: Promise<void> = Promise.resolve();

  private constructor(
    private storage: Storage,
    initial: WorkingsDoc,
    private now: () => Date,
  ) {
    this.doc = initial;
  }

  static async open(storage: Storage, now: () => Date = () => new Date()): Promise<WorkingsStore> {
    const saved = await storage.get<unknown>(WORKINGS_KEY).catch(() => undefined);
    const doc = saved === undefined ? undefined : migrateWorkings(saved);
    if (saved !== undefined && !doc) {
      console.warn('[workings] Saved notes not recognised; a backup was kept.');
      await storage.set(`${WORKINGS_KEY}.backup`, saved).catch(() => {});
    }
    return new WorkingsStore(storage, doc ?? emptyWorkings(), now);
  }

  /** An empty, unsaved store (tests, and screens rendered without saved data). */
  static inMemory(now: () => Date = () => new Date()) {
    return new WorkingsStore(memoryStorage(), emptyWorkings(), now);
  }

  getSnapshot = (): WorkingsDoc => this.doc;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  flush = () => this.writes;

  private commit(next: WorkingsDoc) {
    this.doc = next;
    for (const l of this.listeners) l();
    const snapshot = next;
    this.writes = this.writes
      .then(() => this.storage.set(WORKINGS_KEY, snapshot))
      .catch((e) => console.error('[workings] Could not save', e));
  }

  private at = () => this.now().toISOString();

  /** An empty note deletes it. */
  setQuestionNote(questionId: string, text: string) {
    this.commit({
      ...this.doc,
      questionNotes: withNote(this.doc.questionNotes, questionId, text, this.at()),
    });
  }

  setTopicNote(topic: string, text: string) {
    this.commit({ ...this.doc, topicNotes: withNote(this.doc.topicNotes, topic, text, this.at()) });
  }

  toggleFlag(questionId: string) {
    const flags = { ...this.doc.flags };
    if (flags[questionId]) delete flags[questionId];
    else flags[questionId] = this.at();
    this.commit({ ...this.doc, flags });
  }

  addReport(r: Omit<Report, 'id' | 'at'>): Report {
    const at = this.at();
    const report: Report = {
      ...r,
      id: `r-${Date.parse(at).toString(36)}-${this.doc.reports.length}`,
      at,
    };
    this.commit({ ...this.doc, reports: [...this.doc.reports, report] });
    return report;
  }

  deleteReport(id: string) {
    this.commit({ ...this.doc, reports: this.doc.reports.filter((r) => r.id !== id) });
  }

  /** Replace everything (import, reset). */
  replace(doc: WorkingsDoc) {
    this.commit(doc);
  }
}
