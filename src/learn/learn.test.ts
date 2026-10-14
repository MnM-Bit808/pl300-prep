import rawBank from '../../pl300-bank/questions/all_questions.json';
import { buildBank } from '@/bank/load';
import { emptyProgress, type ProgressDoc } from '@/progress/store';
import { buildCourse, cutPoints, lessonTitle } from './course';
import { lessonState, upNext } from './rules';
import {
  MAX_HEARTS,
  PRACTICE_OPTIONS,
  XP_FIRST_TRY,
  XP_PERFECT_BONUS,
  XP_RETRY,
  firstTryAccuracy,
  sessionReducer,
  startSession,
  type Session,
} from '@/quiz/session';

const bank = buildBank(rawBank);
const course = buildCourse(bank.questions, bank.cases);

describe('buildCourse', () => {
  it('puts units in exam order, case studies last', () => {
    expect(course.units.map((u) => u.domain)).toEqual([
      'prepare',
      'model',
      'visualize',
      'manage',
      'case',
    ]);
  });

  it('uses every question exactly once', () => {
    const ids = course.lessons.flatMap((l) => l.questionIds);
    expect(ids).toHaveLength(bank.questions.length);
    expect(new Set(ids).size).toBe(bank.questions.length);
  });

  it('keeps lessons around 8–10 questions, and never mixes topics', () => {
    const sizes = course.lessons.filter((l) => !l.caseId).map((l) => l.questionIds.length);
    const inRange = sizes.filter((n) => n >= 7 && n <= 11).length;
    expect(inRange / sizes.length).toBeGreaterThan(0.9);
    for (const l of course.lessons) {
      const topics = new Set(l.questionIds.map((id) => bank.questionById.get(id)!.topic));
      expect(topics.size).toBe(1);
    }
  });

  it('orders each lesson easiest first', () => {
    for (const l of course.lessons.filter((x) => !x.caseId)) {
      const d = l.questionIds.map((id) => bank.questionById.get(id)!.difficulty);
      expect(d).toEqual([...d].sort((a, b) => a - b));
    }
  });

  it('makes one lesson per case study', () => {
    const cases = course.units.at(-1)!.lessons;
    expect(cases.map((l) => l.caseId)).toEqual(['CS1', 'CS2', 'CS3', 'CS4']);
    expect(lessonTitle(cases[0]!)).toBe('Tailwind Traders');
  });

  it('snaps cuts to subtopic boundaries when one is close', () => {
    // 20 items, boundaries at 8 and 15: two lessons, ideal cut 10 → nearest boundary 8.
    expect(cutPoints(20, [8, 15], 2)).toEqual([8]);
    // No boundary near the ideal → cut at the ideal.
    expect(cutPoints(20, [3], 2)).toEqual([10]);
  });
});

describe('unlock rules', () => {
  const prepare = course.units[0]!;
  const done = (ids: string[]): ProgressDoc => ({
    ...emptyProgress(),
    lessons: Object.fromEntries(
      ids.map((id, i) => [
        id,
        { bestAccuracy: 1, completions: 1, lastAt: `2026-10-0${i + 1}T10:00:00Z`, questionIds: [] },
      ]),
    ),
  });

  it('opens the first lesson of every unit, and later ones in order', () => {
    const fresh = emptyProgress();
    expect(lessonState(prepare.lessons[0]!, prepare, fresh)).toBe('current');
    expect(lessonState(prepare.lessons[1]!, prepare, fresh)).toBe('locked');
    for (const u of course.units) expect(lessonState(u.lessons[0]!, u, fresh)).not.toBe('locked');

    const after1 = done(['prepare-1']);
    expect(lessonState(prepare.lessons[0]!, prepare, after1)).toBe('done');
    expect(lessonState(prepare.lessons[1]!, prepare, after1)).toBe('current');
  });

  it('suggests continuing in the most recent unit', () => {
    expect(upNext(course, emptyProgress())?.lesson.id).toBe('prepare-1');
    expect(upNext(course, done(['prepare-1', 'model-1']))?.lesson.id).toBe('model-2');
  });
});

describe('lesson session', () => {
  const run = (s: Session, ...answers: boolean[]) =>
    answers.reduce((acc, ok) => {
      const id = acc.queue[acc.pos]!;
      return sessionReducer(
        sessionReducer(acc, { type: 'checked', questionId: id, fullyCorrect: ok }),
        {
          type: 'continue',
        },
      );
    }, s);

  it('a perfect lesson earns first-try XP plus the bonus', () => {
    const s = run(startSession(['a', 'b', 'c']), true, true, true);
    expect(s.status).toBe('complete');
    expect(s.xp).toBe(3 * XP_FIRST_TRY + XP_PERFECT_BONUS);
    expect(firstTryAccuracy(s)).toBe(1);
  });

  it('a wrong answer costs a heart and comes back at the end', () => {
    let s = run(startSession(['a', 'b']), false);
    expect(s.hearts).toBe(MAX_HEARTS - 1);
    expect(s.queue).toEqual(['a', 'b', 'a']);
    s = run(s, true, true);
    expect(s.status).toBe('complete');
    expect(s.xp).toBe(XP_FIRST_TRY + XP_RETRY);
    expect(firstTryAccuracy(s)).toBe(0.5);
  });

  it('ends when hearts run out', () => {
    const s = run(startSession(['a'], { hearts: 2, perfectBonus: true }), false, false);
    expect(s.status).toBe('out-of-hearts');
  });

  it('practice runs have no hearts and no perfect bonus', () => {
    let s = run(
      startSession(['a', 'b'], PRACTICE_OPTIONS),
      false,
      false,
      false,
      false,
      false,
      false,
    );
    expect(s.status).toBe('active');
    expect(s.hearts).toBeNull();
    s = run(s, true, true);
    expect(s.status).toBe('complete');
    expect(s.xp).toBe(2 * XP_RETRY);
    expect(run(startSession(['a'], PRACTICE_OPTIONS), true).xp).toBe(XP_FIRST_TRY);
  });

  it('ignores a check for a question that is not on screen, or a double check', () => {
    const s = startSession(['a', 'b']);
    expect(sessionReducer(s, { type: 'checked', questionId: 'b', fullyCorrect: true })).toBe(s);
    const once = sessionReducer(s, { type: 'checked', questionId: 'a', fullyCorrect: true });
    expect(sessionReducer(once, { type: 'checked', questionId: 'a', fullyCorrect: true })).toBe(
      once,
    );
  });
});
