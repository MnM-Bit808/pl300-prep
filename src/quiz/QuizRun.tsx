/**
 * Runs a set of questions in focus mode: header (quit, progress, hearts), one question at a
 * time, missed questions returning at the end, then a finish screen. Right answers pop their XP
 * out of the header, and three or more in a row show as a combo. Lessons and every
 * practice mode use it; they differ only in options, where answers are filed and what the
 * finish screen says.
 *
 * Render with a key per run: a new key is a clean run.
 */
import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useBank } from '@/bank/useBank';
import { useStickyOffset } from '@/lib/useStickyOffset';
import { CaseFrame } from '@/case/CaseFrame';
import { useProgressStore } from '@/progress/hooks';
import { QuestionCard } from '@/questions/QuestionCard';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { BoltIcon, CloseIcon, HeartIcon } from '@/ui/icons';
import {
  COMBO_FROM,
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
  const headerRef = useRef<HTMLElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  useStickyOffset(headerRef, screenRef);
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
  const combo = session.combo >= COMBO_FROM;

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
    <div ref={screenRef} className={styles.screen}>
      <header ref={headerRef} className={styles.top}>
        <button
          type="button"
          className={styles.quit}
          onClick={() => setConfirmQuit(true)}
          aria-label={`Quit ${noun}`}
        >
          <CloseIcon />
        </button>
        <div className={styles.track}>
          <div
            className={styles.progress}
            role="progressbar"
            aria-label={`${noun.charAt(0).toUpperCase()}${noun.slice(1)} progress`}
            aria-valuemin={0}
            aria-valuemax={session.total}
            aria-valuenow={session.cleared.length}
            aria-valuetext={`${session.cleared.length} of ${session.total} questions done`}
          >
            <span data-fill style={{ width: `${progress * 100}%` }} />
          </div>
          {/* Decoration: the XP is in the finish screen's totals. It rises from the fill's tip. */}
          {session.pending === 'right' && (
            <span
              key={session.pos}
              className={styles.xpPop}
              style={{ left: `${progress * 100}%` }}
              aria-hidden="true"
            >
              +{session.lastGain} XP
            </span>
          )}
        </div>
        {session.hearts !== null ? (
          // Keyed by the count, so losing one replays the drop.
          <p
            key={session.hearts}
            className={styles.hearts}
            data-low={session.hearts <= 1 || undefined}
            data-lost={(options.hearts !== null && session.hearts < options.hearts) || undefined}
          >
            <HeartIcon aria-hidden="true" />
            <span aria-hidden="true">{session.hearts}</span>
            <span className="sr-only">
              {session.hearts} {session.hearts === 1 ? 'heart' : 'hearts'} left
            </span>
          </p>
        ) : (
          <p className={styles.count}>
            {Math.min(session.cleared.length + 1, session.total)}
            <span className={styles.of}> of {session.total}</span>
          </p>
        )}
      </header>

      <main id="main" className={styles.main}>
        <div className={styles.title}>
          {/* The run's name is the page heading. Case questions show the case's name in its
              panel instead, so there it's for screen readers only. */}
          <h1 className={caseStudy ? 'sr-only' : styles.heading}>{title}</h1>
          {isReturn && (
            <span className={styles.second}>Second go: you missed this one earlier</span>
          )}
          {combo && (
            <span key={session.combo} className={styles.combo} aria-hidden="true">
              <BoltIcon />
              {session.combo} in a row
            </span>
          )}
        </div>
        <p className="sr-only" role="status">
          {combo ? `${session.combo} in a row` : ''}
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
