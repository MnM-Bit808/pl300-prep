/**
 * A lesson: the shared quiz run with hearts and the perfect-lesson bonus, filed as 'lesson',
 * then a finish screen that offers the next lesson.
 */
import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useProgress, useProgressStore } from '@/progress/hooks';
import { rollDay } from '@/progress/xp';
import { FinishCard } from '@/quiz/FinishCard';
import { QuizRun } from '@/quiz/QuizRun';
import { firstTryAccuracy, LESSON_OPTIONS, type Session } from '@/quiz/session';
import buttons from '@/ui/buttons.module.css';
import { lessonTitle, type Lesson } from './course';
import { isUnlocked } from './rules';
import { useCourse } from './useCourse';
import styles from './LessonScreen.module.css';
import { useDocumentTitle } from '@/app/title';

export function LessonScreen() {
  const { lessonId = '' } = useParams();
  const { course } = useCourse();
  const lesson = course.lessonById.get(lessonId);
  useDocumentTitle(lesson ? lessonTitle(lesson) : 'Lesson not found');
  const [run, setRun] = useState(0);

  if (!lesson) {
    return (
      <main className={styles.missing}>
        <h1>Lesson not found</h1>
        <p>This lesson doesn't exist, or the question bank changed since the link was made.</p>
        <Link to="/">Back to Learn</Link>
      </main>
    );
  }
  // A new run (or another lesson) is a fresh component with fresh state.
  return (
    <LessonRun key={`${lesson.id}:${run}`} lesson={lesson} onRestart={() => setRun((r) => r + 1)} />
  );
}

function LessonRun({ lesson, onRestart }: { lesson: Lesson; onRestart: () => void }) {
  const store = useProgressStore();
  const doc = useProgress();
  const { course } = useCourse();

  const onFinish = useCallback(
    (s: Session) =>
      store.finishLesson(lesson.id, lesson.questionIds, {
        completed: s.status === 'complete',
        accuracy: firstTryAccuracy(s),
        xp: s.xp,
      }),
    [store, lesson],
  );

  const unit = course.units.find((u) => u.domain === lesson.unit)!;
  const nextLesson = unit.lessons[lesson.number];

  const renderFinish = (s: Session) => {
    const complete = s.status === 'complete';
    const accuracy = firstTryAccuracy(s);
    // Read after banking, so the next lesson shows as unlocked.
    const next = nextLesson && isUnlocked(nextLesson, unit, doc) ? nextLesson : undefined;
    return (
      <FinishCard
        context={lessonTitle(lesson)}
        tone={complete ? 'good' : 'bad'}
        title={complete ? (accuracy === 1 ? 'Perfect lesson' : 'Lesson complete') : 'Out of hearts'}
        text={
          complete
            ? accuracy === 1
              ? 'Every question right the first time.'
              : 'Every question answered. The ones you missed are waiting in Fix mistakes.'
            : `You cleared ${s.cleared.length} of ${s.total} questions. The XP you earned is kept. Finish the lesson to unlock the next one.`
        }
        stats={[
          { label: 'First-try score', value: `${Math.round(accuracy * 100)}%` },
          { label: 'XP earned', value: `+${s.xp}` },
          { label: 'Day streak', value: String(rollDay(doc.xp, store.today()).streak.count) },
        ]}
        actions={
          <>
            {complete && next ? (
              <Link to={`/learn/${next.id}`} className={buttons.primary}>
                Next lesson
              </Link>
            ) : (
              <button type="button" className={buttons.primary} onClick={onRestart}>
                {complete ? 'Redo this lesson' : 'Try again'}
              </button>
            )}
            <Link to="/" className={buttons.secondary}>
              Back to Learn
            </Link>
          </>
        }
      />
    );
  };

  return (
    <QuizRun
      questionIds={lesson.questionIds}
      options={LESSON_OPTIONS}
      mode="lesson"
      noun="lesson"
      title={lessonTitle(lesson)}
      exitTo="/"
      onFinish={onFinish}
      renderFinish={renderFinish}
    />
  );
}
