/**
 * The numbers behind the progress dashboard (BUILD_PROMPT 4.6). Pure: bank, attempt log,
 * progress and "now" in; numbers out. Every figure is designed to be explainable in a sentence
 * on the page.
 *
 * - Mastery: recency-weighted accuracy. Each attempt's weight halves every HALF_LIFE_DAYS, so
 *   what you knew a month ago counts a quarter as much as what you answered today. Credit is
 *   per part (a yes/no question with 2 of 3 right is worth 2/3).
 * - Coverage: questions answered at least once, out of the bank.
 * - Readiness (an estimate, on the 1,000 scale):
 *   - from mocks: the last MOCKS_USED mocks, weighted 3:2:1 towards the most recent;
 *   - from practice: per exam domain, mastery × coverage (coverage counts in full once you've
 *     seen FULL_COVERAGE of the domain), weighted by the exam's domain shares;
 *   - both available: 60% mocks, 40% practice; otherwise whichever exists.
 */
import type { Bank } from '@/bank/load';
import { EXAM_DOMAINS, examDomain, PASS_MARK } from '@/mock/build';
import type { AttemptRecord } from '@/storage/db';
import type { ProgressDoc } from './store';

export const HALF_LIFE_DAYS = 14;
export const MIN_SUBTOPIC_ATTEMPTS = 3;
export const MOCKS_USED = 3;
export const FULL_COVERAGE = 0.6;
const MOCK_SHARE = 0.6;
const DOMAIN_SHARE = { prepare: 0.275, model: 0.275, visualize: 0.275, manage: 0.175 } as const;

type ExamDomain = (typeof EXAM_DOMAINS)[number];

export interface Tally {
  /** Recency-weighted accuracy 0–1, or null with no attempts. */
  mastery: number | null;
  attempts: number;
  seen: number;
  total: number;
}

export interface SubtopicTally extends Tally {
  domain: ExamDomain;
  topic: string;
  subtopic: string;
}

export type Band = 'not-ready' | 'close' | 'on-track';

export interface Analysis {
  domains: Record<ExamDomain, Tally>;
  subtopics: SubtopicTally[];
  /** Weakest first, only subtopics with enough attempts to judge. */
  weakest: SubtopicTally[];
  seen: number;
  total: number;
  practiceScore: number | null;
  mockScore: number | null;
  mocksUsed: number;
  readiness: number | null;
  band: Band | null;
}

export const recencyWeight = (at: string, now: number) => {
  const days = Math.max(0, (now - Date.parse(at)) / 86_400_000);
  return 0.5 ** (days / HALF_LIFE_DAYS);
};

export function bandFor(score: number): Band {
  if (score >= PASS_MARK) return 'on-track';
  return score >= PASS_MARK - 100 ? 'close' : 'not-ready';
}

interface Acc {
  w: number;
  wc: number;
  n: number;
}
const acc = (): Acc => ({ w: 0, wc: 0, n: 0 });
const add = (a: Acc, weight: number, credit: number) => {
  a.w += weight;
  a.wc += weight * credit;
  a.n += 1;
};
const masteryOf = (a: Acc) => (a.w > 0 ? a.wc / a.w : null);

export function analyse(
  bank: Bank,
  attempts: readonly AttemptRecord[],
  doc: ProgressDoc,
  now: number,
): Analysis {
  const domainAcc = Object.fromEntries(EXAM_DOMAINS.map((d) => [d, acc()])) as Record<
    ExamDomain,
    Acc
  >;
  const subAcc = new Map<string, Acc>();

  for (const a of attempts) {
    const q = bank.questionById.get(a.questionId);
    if (!q || a.possible <= 0) continue; // removed from the bank: skipped quietly
    const weight = recencyWeight(a.at, now);
    const credit = a.earned / a.possible;
    add(domainAcc[examDomain(q)], weight, credit);
    const key = `${q.topic}\u0000${q.subtopic}`;
    if (!subAcc.has(key)) subAcc.set(key, acc());
    add(subAcc.get(key)!, weight, credit);
  }

  // Coverage: questions answered at least once, by exam domain and by subtopic.
  const seenIds = new Set(Object.keys(doc.questions).filter((id) => bank.questionById.has(id)));
  const domainCount = Object.fromEntries(
    EXAM_DOMAINS.map((d) => [d, { seen: 0, total: 0 }]),
  ) as Record<ExamDomain, { seen: number; total: number }>;
  const subCount = new Map<
    string,
    { domain: ExamDomain; topic: string; subtopic: string; seen: number; total: number }
  >();
  for (const q of bank.questions) {
    const d = examDomain(q);
    domainCount[d].total += 1;
    if (seenIds.has(q.id)) domainCount[d].seen += 1;
    const key = `${q.topic}\u0000${q.subtopic}`;
    const s = subCount.get(key) ?? {
      domain: d,
      topic: q.topic,
      subtopic: q.subtopic,
      seen: 0,
      total: 0,
    };
    s.total += 1;
    if (seenIds.has(q.id)) s.seen += 1;
    subCount.set(key, s);
  }

  const domains = Object.fromEntries(
    EXAM_DOMAINS.map((d) => [
      d,
      { mastery: masteryOf(domainAcc[d]), attempts: domainAcc[d].n, ...domainCount[d] },
    ]),
  ) as Record<ExamDomain, Tally>;

  const subtopics: SubtopicTally[] = [...subCount].map(([key, s]) => {
    const a = subAcc.get(key) ?? acc();
    return { ...s, mastery: masteryOf(a), attempts: a.n };
  });
  const weakest = subtopics
    .filter((s) => s.mastery !== null && s.attempts >= MIN_SUBTOPIC_ATTEMPTS)
    .sort((a, b) => a.mastery! - b.mastery! || b.attempts - a.attempts);

  // Practice estimate: mastery × coverage per domain, weighted like the exam.
  const anyPractice = EXAM_DOMAINS.some((d) => domains[d].mastery !== null);
  const practiceScore = anyPractice
    ? Math.round(
        1000 *
          EXAM_DOMAINS.reduce((sum, d) => {
            const t = domains[d];
            const coverage = t.total ? Math.min(1, t.seen / t.total / FULL_COVERAGE) : 0;
            return sum + DOMAIN_SHARE[d] * (t.mastery ?? 0) * coverage;
          }, 0),
      )
    : null;

  // Mock estimate: last three, weighted 3:2:1 towards the most recent.
  const recent = [...doc.mocks]
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .slice(0, MOCKS_USED);
  const weights = recent.map((_, i) => MOCKS_USED - i);
  const mockScore = recent.length
    ? Math.round(
        recent.reduce((s, m, i) => s + m.score.scaled * weights[i]!, 0) /
          weights.reduce((a, b) => a + b, 0),
      )
    : null;

  const readiness =
    mockScore !== null && practiceScore !== null
      ? Math.round(MOCK_SHARE * mockScore + (1 - MOCK_SHARE) * practiceScore)
      : (mockScore ?? practiceScore);

  return {
    domains,
    subtopics,
    weakest,
    seen: seenIds.size,
    total: bank.questions.length,
    practiceScore,
    mockScore,
    mocksUsed: recent.length,
    readiness,
    band: readiness === null ? null : bandFor(readiness),
  };
}
