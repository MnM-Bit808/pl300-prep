/**
 * A lesson run: the questions one by one, with hearts, a progress bar and a quit option, then
 * a finish screen. Focus mode: no site navigation while a lesson is on.
 */
import { useEffect, useReducer, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { CaseFrame } from '@/case/CaseFrame';
import { useProgress, useProgressStore } from '@/progress/hooks';
import { localDay, rollDay } from '@/progress/xp';
import { QuestionCard } from '@/questions/QuestionCard';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { CloseIcon, HeartIcon } from '@/ui/icons';
import { lessonTitle, type Lesson } from './course';
import { isUnlocked } from './rules';
import {
  currentQuestion,
  firstTryAccuracy,
  sessionProgress,
  sessionReducer,
  startSession,
} from './session';
import { useCourse } from './useCourse';
import styles from './LessonScreen.module.css';

export function LessonScreen() {
  const { lessonId = '' } = useParams();
  const { course } = useCourse();
  const lesson = course.lessonById.get(lessonId);
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
  const { bank, course } = useCourse();
  const store = useProgressStore();
  const doc = useProgress();
  const navigate = useNavigate();
  const [session, dispatch] = useReducer(sessionReducer, lesson.questionIds, (ids) =>
    startSession(ids.filter((id) => bank.questionById.has(id))),
  );
  const [confirmQuit, setConfirmQuit] = useState(false);
  const banked = useRef(false);

  const qid = currentQuestion(session);
  const question = qid ? bank.questionById.get(qid) : undefined;
  const caseStudy = lesson.caseId ? bank.caseById.get(lesson.caseId) : undefined;
  const isReturn = Boolean(qid && session.missed.includes(qid) && session.pending === null);
  const finished = session.status !== 'active';

  // Bank XP and record completion once, when the run ends.
  useEffect(() => {
    if (!finished || banked.current) return;
    banked.current = true;
    store.finishLesson(lesson.id, lesson.questionIds, {
      completed: session.status === 'complete',
      accuracy: firstTryAccuracy(session),
      xp: session.xp,
    });
  }, [finished, session, store, lesson]);

  // Esc asks to quit (unless a dialog, like the exhibit viewer, has Esc for itself).
  useEffect(() => {
    if (finished) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) setConfirmQuit(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [finished]);

  const unit = course.units.find((u) => u.domain === lesson.unit)!;
  const nextLesson = unit.lessons[lesson.number];
  const nextOpen = nextLesson && isUnlocked(nextLesson, unit, doc) ? nextLesson : undefined;

  if (finished) {
    return (
      <FinishScreen
        lesson={lesson}
        status={session.status}
        accuracy={firstTryAccuracy(session)}
        xp={session.xp}
        cleared={session.cleared.length}
        total={session.total}
        streak={rollDay(doc.xp, localDay()).streak.count}
        next={nextOpen}
        onRetry={onRestart}
      />
    );
  }

  const card = question && (
    <QuestionCard
      key={`${question.id}-${session.pos}`}
      question={question}
      allowRetry={false}
      onCheck={(score) => {
        store.recordAnswer(question.id, score, 'lesson');
        dispatch({
          type: 'checked',
          questionId: question.id,
          fullyCorrect: score.earned === score.possible,
        });
      }}
      onContinue={() => dispatch({ type: 'continue' })}
    />
  );

  const progress = sessionProgress(session);

  return (
    <div className={styles.screen}>
      <header className={styles.top}>
        <button
          type="button"
          className={styles.quit}
          onClick={() => setConfirmQuit(true)}
          aria-label="Quit lesson"
        >
          <CloseIcon />
        </button>
        <div
          className={styles.progress}
          role="progressbar"
          aria-label="Lesson progress"
          aria-valuemin={0}
          aria-valuemax={session.total}
          aria-valuenow={session.cleared.length}
          aria-valuetext={`${session.cleared.length} of ${session.total} questions done`}
        >
          <span style={{ width: `${progress * 100}%` }} />
        </div>
        <p
          className={styles.hearts}
          aria-label={`${session.hearts} hearts left`}
          data-low={session.hearts <= 1 || undefined}
        >
          <HeartIcon />
          <span aria-hidden="true">{session.hearts}</span>
        </p>
      </header>

      <main id="main" className={styles.main} data-case={caseStudy ? '' : undefined}>
        {/* Case lessons are named by the case panel itself. */}
        {!caseStudy && (
          <p className={styles.lessonName}>
            {lessonTitle(lesson)}
            {isReturn && (
              <span className={styles.second}>Second go: you missed this one earlier</span>
            )}
          </p>
        )}
        {caseStudy ? (
          <CaseFrame key={caseStudy.id} caseStudy={caseStudy}>
            {card}
          </CaseFrame>
        ) : (
          card
        )}
      </main>

      {confirmQuit && (
        <ConfirmDialog
          title="Quit this lesson?"
          body="XP from this run won't be saved. Answers you've checked are still recorded."
          cancelLabel="Keep going"
          confirmLabel="Quit"
          onCancel={() => setConfirmQuit(false)}
          onConfirm={() => navigate('/')}
        />
      )}
    </div>
  );
}

interface FinishProps {
  lesson: Lesson;
  status: 'complete' | 'out-of-hearts' | 'active';
  accuracy: number;
  xp: number;
  cleared: number;
  total: number;
  streak: number;
  next: Lesson | undefined;
  onRetry: () => void;
}

function FinishScreen({
  lesson,
  status,
  accuracy,
  xp,
  cleared,
  total,
  streak,
  next,
  onRetry,
}: FinishProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  const complete = status === 'complete';

  return (
    <main id="main" className={styles.finish} data-result={complete ? 'complete' : 'out'}>
      <div className={styles.finishCard}>
        <p className={styles.finishLesson}>{lessonTitle(lesson)}</p>
        <h1 ref={headingRef} tabIndex={-1} className={styles.finishTitle}>
          {complete ? (accuracy === 1 ? 'Perfect lesson' : 'Lesson complete') : 'Out of hearts'}
        </h1>
        <p className={styles.finishText}>
          {complete
            ? accuracy === 1
              ? 'Every question right the first time.'
              : 'Every question answered. The ones you missed are worth another look in practice.'
            : `You cleared ${cleared} of ${total} questions. The XP you earned is kept. Finish the lesson to unlock the next one.`}
        </p>

        <dl className={styles.stats}>
          <div>
            <dt>First-try score</dt>
            <dd>{Math.round(accuracy * 100)}%</dd>
          </div>
          <div>
            <dt>XP earned</dt>
            <dd>+{xp}</dd>
          </div>
          <div>
            <dt>Day streak</dt>
            <dd>{streak}</dd>
          </div>
        </dl>

        <div className={styles.finishActions}>
          {complete && next ? (
            <Link to={`/learn/${next.id}`} className={styles.primary}>
              Next lesson
            </Link>
          ) : (
            <button type="button" className={styles.primary} onClick={onRetry}>
              {complete ? 'Redo this lesson' : 'Try again'}
            </button>
          )}
          <Link to="/" className={styles.secondary}>
            Back to Learn
          </Link>
        </div>
      </div>
    </main>
  );
}
