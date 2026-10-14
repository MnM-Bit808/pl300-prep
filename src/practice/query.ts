/** The practice filter in the URL (?domain=&topic=&subtopic=&d=1,3&n=20), shared by the hub,
 * practice runs and flashcards so every view of a selection is linkable. */
import { DOMAINS, type Domain } from '@/bank/constants';
import type { PracticeFilter } from './select';

const FILTER_KEYS = ['domain', 'topic', 'subtopic', 'd'] as const;

export function parseFilter(params: URLSearchParams): PracticeFilter {
  const domain = params.get('domain');
  const difficulties = (params.get('d') ?? '')
    .split(',')
    .map(Number)
    .filter((n): n is 1 | 2 | 3 => n === 1 || n === 2 || n === 3);
  return {
    domain: DOMAINS.includes(domain as Domain) ? (domain as Domain) : undefined,
    topic: params.get('topic') ?? undefined,
    subtopic: params.get('subtopic') ?? undefined,
    difficulties,
  };
}

/** Run length from ?n= (0 = all; default 10). */
export const parseLength = (params: URLSearchParams) => {
  const n = Number(params.get('n') ?? 10);
  return Number.isFinite(n) && n >= 0 ? n : 10;
};

/** A query string carrying the current filter plus extra keys. */
export function filterQuery(params: URLSearchParams, extra: Record<string, string>) {
  const q = new URLSearchParams(extra);
  for (const key of FILTER_KEYS) {
    const v = params.get(key);
    if (v) q.set(key, v);
  }
  return q.toString();
}
