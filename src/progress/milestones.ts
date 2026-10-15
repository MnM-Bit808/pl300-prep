/**
 * Milestones: one-off achievements tied to preparing for the exam, not to arbitrary levels.
 * Each is earned once and kept with the day it was earned, so a mastery that later fades
 * doesn't take a badge back. Pure: the store checks the ones its document can answer; the
 * Progress page adds the ones that need the course and the analytics.
 */
import { DOMAIN_SHORT, type Domain } from '@/bank/constants';
import { UNIT_INFO } from '@/learn/course';

export interface Milestone {
  id: string;
  title: string;
  /** How to earn it, shown until it's earned. */
  detail: string;
  domain?: Domain;
}

const EXAM_DOMAINS = ['prepare', 'model', 'visualize', 'manage'] as const;

/** Mastery that counts as mastered, and how much of the domain must have been seen. */
export const MASTERED = 0.8;
export const MASTERED_COVERAGE = 0.6;

export const MILESTONES: readonly Milestone[] = [
  { id: 'first-lesson', title: 'First step applied', detail: 'Finish your first lesson.' },
  { id: 'streak-7', title: 'A week straight', detail: 'Practise seven days in a row.' },
  { id: 'first-mock', title: 'First mock exam', detail: 'Finish a mock exam.' },
  { id: 'mock-pass', title: 'Over the line', detail: 'Score 700 or more in a mock exam.' },
  ...EXAM_DOMAINS.map((d) => ({
    id: `${d}-steps`,
    title: `${DOMAIN_SHORT[d]}: every step`,
    detail: `Finish every lesson in ${UNIT_INFO[d].title}.`,
    domain: d,
  })),
  ...EXAM_DOMAINS.map((d) => ({
    id: `${d}-mastery`,
    title: `${DOMAIN_SHORT[d]} mastered`,
    detail: `Reach ${MASTERED * 100}% recent accuracy with most of its questions seen.`,
    domain: d,
  })),
  {
    id: 'case-all',
    title: 'Every case study',
    detail: 'Finish all the case-study lessons.',
    domain: 'case',
  },
  { id: 'streak-30', title: 'Thirty days', detail: 'Practise 30 days in a row.' },
];

export interface MilestoneInput {
  lessonsDone: number;
  streak: number;
  mockScores: readonly number[];
  /** Units whose every lesson is done. */
  unitsComplete?: readonly Domain[];
  /** Per exam domain: recent mastery and coverage, when known. */
  mastery?: Partial<Record<Domain, { mastery: number | null; seen: number; total: number }>>;
}

/** Ids of the milestones the input meets right now. */
export function reached(i: MilestoneInput): string[] {
  const ids: string[] = [];
  if (i.lessonsDone >= 1) ids.push('first-lesson');
  if (i.streak >= 7) ids.push('streak-7');
  if (i.streak >= 30) ids.push('streak-30');
  if (i.mockScores.length) ids.push('first-mock');
  if (i.mockScores.some((s) => s >= 700)) ids.push('mock-pass');
  for (const d of i.unitsComplete ?? []) ids.push(d === 'case' ? 'case-all' : `${d}-steps`);
  for (const d of EXAM_DOMAINS) {
    const t = i.mastery?.[d];
    if (t && t.mastery !== null && t.mastery >= MASTERED && t.seen / t.total >= MASTERED_COVERAGE)
      ids.push(`${d}-mastery`);
  }
  return ids;
}
