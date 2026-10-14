/**
 * Builds a mock exam (BUILD_PROMPT 4.5): 50 questions in two sections.
 *
 * - Section 2 is one whole case study (6–7 questions), in the case's own order. The case used
 *   least recently in past mocks is chosen, so all four come round in turn.
 * - Section 1 fills the rest to the exam's domain weights (Prepare, Model and Visualize
 *   25–30% each, Manage 15–20%) using the midpoints and largest-remainder rounding.
 * - Within a domain, questions are spread across topics in proportion to topic size, and
 *   questions used in recent mocks are picked last. Section 1 is then shuffled.
 */
import type { Bank } from '@/bank/load';
import type { Domain, Question } from '@/bank/schema';
import { shuffled } from '@/lib/random';

export const MOCK_SIZE = 50;
export const MOCK_MINUTES = 100;
export const PASS_MARK = 700;

type ExamDomain = Exclude<Domain, 'case'>;
export const EXAM_DOMAINS: readonly ExamDomain[] = ['prepare', 'model', 'visualize', 'manage'];

/** Exam weight midpoints: 27.5%, 27.5%, 27.5%, 17.5%. */
const WEIGHTS: Record<ExamDomain, number> = {
  prepare: 0.275,
  model: 0.275,
  visualize: 0.275,
  manage: 0.175,
};

/** Case questions name the exam domain they test in their subtopic. */
const CASE_SUBTOPIC_DOMAIN: Record<string, ExamDomain> = {
  'Prepare the data': 'prepare',
  'Model the data': 'model',
  'Visualize and analyze': 'visualize',
  'Manage and secure': 'manage',
};

/** The exam domain a question counts towards in results. */
export function examDomain(q: Question): ExamDomain {
  if (q.domain !== 'case') return q.domain;
  return CASE_SUBTOPIC_DOMAIN[q.subtopic] ?? 'model';
}

/** Splits `total` by `weights`, rounding so the parts add up exactly (largest remainder). */
export function apportion<K extends string>(
  total: number,
  weights: Record<K, number>,
): Record<K, number> {
  const keys = Object.keys(weights) as K[];
  const sum = keys.reduce((s, k) => s + weights[k], 0);
  const raw = keys.map((k) => ({ k, exact: (total * weights[k]) / sum }));
  const out = Object.fromEntries(raw.map((r) => [r.k, Math.floor(r.exact)])) as Record<K, number>;
  let left = total - keys.reduce((s, k) => s + out[k], 0);
  for (const r of [...raw].sort(
    (a, b) => b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)),
  )) {
    if (left <= 0) break;
    out[r.k] += 1;
    left -= 1;
  }
  return out;
}

export interface MockSection {
  kind: 'main' | 'case';
  questionIds: string[];
  caseId?: string;
}

/** What building needs from past mocks (a MockRecord fits). */
export interface MockHistoryLike {
  caseId: string;
  sections: readonly { questionIds: readonly string[] }[];
  submittedAt: string;
}

export function buildMock(
  bank: Bank,
  history: readonly MockHistoryLike[],
  random: () => number = Math.random,
): MockSection[] {
  const recent = [...history].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  // Case study: the one least recently used (never used counts as oldest).
  const lastUsed = (caseId: string) => recent.findIndex((m) => m.caseId === caseId);
  const cases = shuffled(
    bank.cases.filter((c) => bank.questions.some((q) => q.caseId === c.id)),
    random,
  ).sort((a, b) => {
    const ia = lastUsed(a.id);
    const ib = lastUsed(b.id);
    return (ib === -1 ? Infinity : ib) - (ia === -1 ? Infinity : ia);
  });
  const caseStudy = cases[0];
  const caseIds = caseStudy
    ? bank.questions.filter((q) => q.caseId === caseStudy.id).map((q) => q.id)
    : [];

  // Section 1 to the domain weights.
  const recentIds = new Set(
    recent.slice(0, 2).flatMap((m) => m.sections.flatMap((s) => s.questionIds)),
  );
  const counts = apportion(MOCK_SIZE - caseIds.length, WEIGHTS);
  const main: string[] = [];
  for (const domain of EXAM_DOMAINS) {
    const pool = bank.questions.filter((q) => q.domain === domain);
    const byTopic = new Map<string, Question[]>();
    for (const q of pool) byTopic.set(q.topic, [...(byTopic.get(q.topic) ?? []), q]);
    const perTopic = apportion(
      counts[domain],
      Object.fromEntries([...byTopic].map(([t, qs]) => [t, qs.length])) as Record<string, number>,
    );
    for (const [topic, qs] of byTopic) {
      // Fresh questions first, random within each group.
      const ordered = shuffled(qs, random).sort(
        (a, b) => Number(recentIds.has(a.id)) - Number(recentIds.has(b.id)),
      );
      main.push(...ordered.slice(0, perTopic[topic]).map((q) => q.id));
    }
  }

  const sections: MockSection[] = [{ kind: 'main', questionIds: shuffled(main, random) }];
  if (caseStudy) sections.push({ kind: 'case', questionIds: caseIds, caseId: caseStudy.id });
  return sections;
}
