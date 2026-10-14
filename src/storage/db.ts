/**
 * Thin promise wrapper over IndexedDB for the app's two stores:
 * - "kv": small documents by key (the progress document, later notes and settings).
 * - "attempts": an append-only log of every answer, indexed by question id.
 *
 * If IndexedDB is unavailable (some private modes, blocked storage), everything falls back to
 * memory: the app keeps working and progress lasts for the visit.
 */
const DB_NAME = 'pl300-prep';
const DB_VERSION = 1;

export interface AttemptRecord {
  id?: number;
  questionId: string;
  /** ISO timestamp. */
  at: string;
  earned: number;
  possible: number;
  /** Where it was answered: 'lesson', 'practice', 'review', 'mock'. */
  mode: string;
}

export interface Storage {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  addAttempt(a: AttemptRecord): Promise<void>;
  attempts(): Promise<AttemptRecord[]>;
  clear(): Promise<void>;
  /** False when running on the in-memory fallback. */
  persistent: boolean;
}

const request = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('attempts')) {
        const s = db.createObjectStore('attempts', { keyPath: 'id', autoIncrement: true });
        s.createIndex('questionId', 'questionId');
      }
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error('IndexedDB upgrade blocked by another tab'));
  });
}

function idbStorage(db: IDBDatabase): Storage {
  const store = (name: string, mode: IDBTransactionMode) =>
    db.transaction(name, mode).objectStore(name);
  return {
    persistent: true,
    get: <T>(key: string) => request(store('kv', 'readonly').get(key)) as Promise<T | undefined>,
    set: async (key, value) => {
      await request(store('kv', 'readwrite').put(value, key));
    },
    addAttempt: async (a) => {
      await request(store('attempts', 'readwrite').add(a));
    },
    attempts: () => request(store('attempts', 'readonly').getAll()) as Promise<AttemptRecord[]>,
    clear: async () => {
      await request(store('kv', 'readwrite').clear());
      await request(store('attempts', 'readwrite').clear());
    },
  };
}

export function memoryStorage(): Storage {
  const kv = new Map<string, unknown>();
  let log: AttemptRecord[] = [];
  return {
    persistent: false,
    get: async <T>(key: string) => structuredClone(kv.get(key)) as T | undefined,
    set: async (key, value) => {
      kv.set(key, structuredClone(value));
    },
    addAttempt: async (a) => {
      log.push({ ...a, id: log.length + 1 });
    },
    attempts: async () => log.slice(),
    clear: async () => {
      kv.clear();
      log = [];
    },
  };
}

export async function openStorage(): Promise<Storage> {
  try {
    if (typeof indexedDB === 'undefined') throw new Error('IndexedDB not available');
    return idbStorage(await openDb());
  } catch (error) {
    console.warn('[storage] Using memory only; progress will last for this visit.', error);
    return memoryStorage();
  }
}
