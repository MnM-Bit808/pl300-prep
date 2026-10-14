/**
 * Runs a set of questions in focus mode: header (quit, progress, hearts), one question at a
 * time, missed questions returning at the end, then a finish screen. Lessons and every
 * practice mode use it; they differ only in options, where answers are filed and what the
 * finish screen says.
 *
 * Render with a key per run: a new key is a clean run.
 */
import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useBank } from '@/bank/useBank';
import { CaseFrame } from '@/case/CaseFrame';
import { useProgressStore } from '@/progress/hooks';
import { QuestionCard } from '@/questions/QuestionCard';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { CloseIcon, HeartIcon } from '@/ui/icons';
import {
  currentQuestion,
  sessionProgress,
  sessionReducer,
  startSession,
  type Session,
  type SessionOptions,
} from './session';
import styles from './QuizRun.module.css';

interface Props {
  questionIds: readonly string[];
  options: SessionOptions;
  /** Filed with each attempt: 'lesson', 'practice', 'review', 'mistakes'. */
  mode: string;
  /** What this run is called in sentences: "lesson", "practice", "review". */
  noun: string;
  /** Shown above each question. */
  title: string;
  /** Where Quit goes. */
  exitTo: string;
  /** Called once when the run ends (bank XP, mark completion). */
  onFinish: (session: Session) => void;
  renderFinish: (session: Session) => ReactNode;
}

export function QuizRun({
  questionIds,
  options,
  mode,
  noun,
  title,
  exitTo,
  onFinish,
  renderFinish,
}: Props) {
  const bank = useBank();
  const store = useProgressStore();
  const navigate = useNavigate();
  const [session, dispatch] = useReducer(sessionReducer, null, () =>
    startSession(
      questionIds.filter((id) => bank.questionById.has(id)),
      options,
    ),
  );
  const [confirmQuit, setConfirmQuit] = useState(false);
  const finishedOnce = useRef(false);
  const finished = session.status !== 'active';

  useEffect(() => {
    if (!finished || finishedOnce.current) return;
    finishedOnce.current = true;
    onFinish(session);
  }, [finished, session, onFinish]);

  // Esc asks to quit (unless a dialog, like the exhibit viewer, wants Esc for itself).
  useEffect(() => {
    if (finished) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) setConfirmQuit(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [finished]);

  if (finished) return <>{renderFinish(session)}</>;

  const qid = currentQuestion(session);
  const question = qid ? bank.questionById.get(qid) : undefined;
  const caseStudy = question?.caseId ? bank.caseById.get(question.caseId) : undefined;
  const isReturn = Boolean(qid && session.missed.includes(qid) && session.pending === null);
  const progress = sessionProgress(session);

  const card = question && (
    <QuestionCard
      key={`${question.id}-${session.pos}`}
      question={question}
      allowRetry={false}
      onCheck={(score) => {
        // A question back after a miss in this run is a retry: logged, but it doesn't clear the
        // mistake or move the review schedule.
        store.recordAnswer(question.id, score, mode, {
          retry: session.missed.includes(question.id),
        });
        dispatch({
          type: 'checked',
          questionId: question.id,
          fullyCorrect: score.earned === score.possible,
        });
      }}
      onContinue={() => dispatch({ type: 'continue' })}
    />
  );

  return (
    <div className={styles.screen}>
      <header className={styles.top}>
        <button
          type="button"
          className={styles.quit}
          onClick={() => setConfirmQuit(true)}
          aria-label={`Quit ${noun}`}
        >
          <CloseIcon />
        </button>
        <div
          className={styles.progress}
          role="progressbar"
          aria-label={`${noun.charAt(0).toUpperCase()}${noun.slice(1)} progress`}
          aria-valuemin={0}
          aria-valuemax={session.total}
          aria-valuenow={session.cleared.length}
          aria-valuetext={`${session.cleared.length} of ${session.total} questions done`}
        >
          <span style={{ width: `${progress * 100}%` }} />
        </div>
        {session.hearts !== null ? (
          <p
            className={styles.hearts}
            aria-label={`${session.hearts} hearts left`}
            data-low={session.hearts <= 1 || undefined}
          >
            <HeartIcon />
            <span aria-hidden="true">{session.hearts}</span>
          </p>
        ) : (
          <p className={styles.count}>
            {Math.min(session.cleared.length + 1, session.total)}
            <span className={styles.of}> of {session.total}</span>
          </p>
        )}
      </header>

      <main id="main" className={styles.main}>
        <p className={styles.title}>
          {/* Case questions are named by their case panel. */}
          {!caseStudy && title}
          {isReturn && (
            <span className={styles.second}>Second go: you missed this one earlier</span>
          )}
        </p>
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
          title={`Quit this ${noun}?`}
          body="XP from this run won't be saved. Answers you've checked are still recorded."
          cancelLabel="Keep going"
          confirmLabel="Quit"
          onCancel={() => setConfirmQuit(false)}
          onConfirm={() => navigate(exitTo)}
        />
      )}
    </div>
  );
}
