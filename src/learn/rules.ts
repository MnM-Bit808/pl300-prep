/**
 * Unlock rules (from Paath): every unit is open, so you can start anywhere; inside a unit,
 * lessons unlock in order as the one before is completed.
 */
import type { ProgressDoc } from '@/progress/store';
import type { Course, Lesson, Unit } from './course';

export type LessonState = 'done' | 'current' | 'open' | 'locked';

export const isDone = (lesson: Lesson, doc: ProgressDoc) => Boolean(doc.lessons[lesson.id]);

export function isUnlocked(lesson: Lesson, unit: Unit, doc: ProgressDoc): boolean {
  if (lesson.number === 1) return true;
  const previous = unit.lessons[lesson.number - 2];
  return previous ? isDone(previous, doc) : true;
}

/** The first unlocked, unfinished lesson in a unit. */
export const nextInUnit = (unit: Unit, doc: ProgressDoc) =>
  unit.lessons.find((l) => !isDone(l, doc) && isUnlocked(l, unit, doc));

export function lessonState(lesson: Lesson, unit: Unit, doc: ProgressDoc): LessonState {
  if (isDone(lesson, doc)) return 'done';
  if (!isUnlocked(lesson, unit, doc)) return 'locked';
  return nextInUnit(unit, doc)?.id === lesson.id ? 'current' : 'open';
}

/** Where to go next: carry on in the unit worked in most recently, else the first unit with
 * something left. Null when the whole course is done. */
export function upNext(course: Course, doc: ProgressDoc): { unit: Unit; lesson: Lesson } | null {
  const latest = Object.entries(doc.lessons).sort((a, b) =>
    b[1].lastAt.localeCompare(a[1].lastAt),
  )[0];
  const recentUnit = latest ? course.lessonById.get(latest[0])?.unit : undefined;
  const order = [
    ...course.units.filter((u) => u.domain === recentUnit),
    ...course.units.filter((u) => u.domain !== recentUnit),
  ];
  for (const unit of order) {
    const lesson = nextInUnit(unit, doc);
    if (lesson) return { unit, lesson };
  }
  return null;
}

export const unitDone = (unit: Unit, doc: ProgressDoc) =>
  unit.lessons.filter((l) => isDone(l, doc)).length;
