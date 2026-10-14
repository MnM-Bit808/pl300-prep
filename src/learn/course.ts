/**
 * Builds the Learn path from the bank (BUILD_PROMPT 4.3).
 *
 * - Units are exam domains in exam order; the last unit is the case studies.
 * - Within a unit, topics keep their bank order. Each topic is cut into lessons of about
 *   LESSON_TARGET questions, cutting at a subtopic boundary when one is close to the ideal cut,
 *   so a lesson usually covers one or two whole subtopics.
 * - Within a lesson, questions run easiest first (stable, so bank order breaks ties).
 * - Case studies: one lesson per case, in the case's own question order.
 *
 * Lesson ids are derived from position (`model-3`), so a bank change that adds questions can
 * shift lesson boundaries. Completion records therefore also keep the ids they covered.
 */
import type { CaseStudy, Domain, Question } from '@/bank/schema';

export const LESSON_TARGET = 9;
const BOUNDARY_SLACK = 2;

export interface Lesson {
  id: string;
  unit: Domain;
  /** 1-based position in its unit. */
  number: number;
  topic: string;
  /** Subtopics covered, in order. */
  subtopics: string[];
  questionIds: string[];
  caseId?: string;
}

export interface Unit {
  domain: Domain;
  title: string;
  /** Share of the exam, for the unit header. */
  weight: string;
  lessons: Lesson[];
}

export interface Course {
  units: Unit[];
  lessons: Lesson[];
  lessonById: ReadonlyMap<string, Lesson>;
}

export const UNIT_INFO: Record<Domain, { title: string; weight: string }> = {
  prepare: { title: 'Prepare the data', weight: '25–30% of the exam' },
  model: { title: 'Model the data', weight: '25–30% of the exam' },
  visualize: { title: 'Visualize and analyze the data', weight: '25–30% of the exam' },
  manage: { title: 'Manage and secure Power BI', weight: '15–20% of the exam' },
  case: { title: 'Case studies', weight: 'One case study per exam' },
};

const UNIT_ORDER: readonly Domain[] = ['prepare', 'model', 'visualize', 'manage', 'case'];

/** Group items by key, keeping first-seen key order and item order. */
function groupInOrder<T>(items: readonly T[], key: (item: T) => string): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = groups.get(k);
    if (list) list.push(item);
    else groups.set(k, [item]);
  }
  return [...groups];
}

/** Cut points for splitting `total` items into `n` near-equal lessons, snapped to a subtopic
 * boundary when one is within BOUNDARY_SLACK of the ideal cut. */
export function cutPoints(total: number, boundaries: readonly number[], n: number): number[] {
  const cuts: number[] = [];
  let previous = 0;
  for (let i = 1; i < n; i++) {
    const ideal = Math.round((total * i) / n);
    const near = boundaries
      .filter((b) => b > previous && b < total && Math.abs(b - ideal) <= BOUNDARY_SLACK)
      .sort((a, b) => Math.abs(a - ideal) - Math.abs(b - ideal))[0];
    const cut = near ?? ideal;
    if (cut > previous && cut < total) {
      cuts.push(cut);
      previous = cut;
    }
  }
  return cuts;
}

const byDifficulty = (a: Question, b: Question) => a.difficulty - b.difficulty;

export function buildCourse(questions: readonly Question[], cases: readonly CaseStudy[]): Course {
  const units: Unit[] = UNIT_ORDER.map((domain) => ({ domain, ...UNIT_INFO[domain], lessons: [] }));
  const unitOf = new Map(units.map((u) => [u.domain, u]));

  for (const [domain, inDomain] of groupInOrder(
    questions.filter((q) => q.domain !== 'case'),
    (q) => q.domain,
  )) {
    const unit = unitOf.get(domain as Domain);
    if (!unit) continue;
    for (const [topic, inTopic] of groupInOrder(inDomain, (q) => q.topic)) {
      // Keep subtopics together, in first-seen order.
      const ordered = groupInOrder(inTopic, (q) => q.subtopic).flatMap(([, qs]) => qs);
      const boundaries: number[] = [];
      ordered.forEach((q, i) => {
        if (i > 0 && q.subtopic !== ordered[i - 1]!.subtopic) boundaries.push(i);
      });
      const n = Math.max(1, Math.round(ordered.length / LESSON_TARGET));
      const edges = [0, ...cutPoints(ordered.length, boundaries, n), ordered.length];
      for (let i = 0; i < edges.length - 1; i++) {
        const chunk = ordered.slice(edges[i], edges[i + 1]);
        unit.lessons.push({
          id: `${domain}-${unit.lessons.length + 1}`,
          unit: unit.domain,
          number: unit.lessons.length + 1,
          topic,
          subtopics: [...new Set(chunk.map((q) => q.subtopic))],
          questionIds: chunk
            .slice()
            .sort(byDifficulty)
            .map((q) => q.id),
        });
      }
    }
  }

  const caseUnit = unitOf.get('case')!;
  for (const c of cases) {
    const ids = questions.filter((q) => q.caseId === c.id).map((q) => q.id);
    if (!ids.length) continue;
    caseUnit.lessons.push({
      id: `case-${caseUnit.lessons.length + 1}`,
      unit: 'case',
      number: caseUnit.lessons.length + 1,
      topic: c.title,
      subtopics: [],
      questionIds: ids,
      caseId: c.id,
    });
  }

  const nonEmpty = units.filter((u) => u.lessons.length);
  const lessons = nonEmpty.flatMap((u) => u.lessons);
  return { units: nonEmpty, lessons, lessonById: new Map(lessons.map((l) => [l.id, l])) };
}

/** Short title for a lesson: its subtopics, or the case name. */
export function lessonTitle(lesson: Lesson): string {
  if (lesson.caseId) return lesson.topic;
  // Subtopic names keep their own casing ("DAX", "Power Query"), so they're listed, not merged
  // into a sentence.
  const [first, second, ...rest] = lesson.subtopics;
  if (!second) return first ?? lesson.topic;
  if (!rest.length) return `${first}, ${second}`;
  return `${first}, ${second} and ${rest.length} more`;
}
