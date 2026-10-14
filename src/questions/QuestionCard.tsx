/**
 * One question with instant feedback: the question body, a sticky check bar, and after
 * checking the verdict, explanation and takeaway. Used by the lab, lessons and practice. The
 * mock exam uses QuestionBody on its own (no feedback until the end).
 */
import { useEffect, useId, useRef, useState } from 'react';
import type { Question } from '@/bank/schema';
import { dialogOpen, isTypingTarget } from '@/lib/keys';
import { RetryIcon } from '@/ui/icons';
import { Feedback, VerdictIcon } from './Feedback';
import { progressText, verdictText } from './labels';
import { QuestionBody } from './QuestionBody';
import { scoreAnswer, verdictOf, type Score } from './scoring';
import { useAttempt } from './useAttempt';
import styles from './QuestionCard.module.css';

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Render with `key={question.id}`: a new question is a new attempt with fresh state. */
interface Props {
  question: Question;
  /** Shown after checking. Omit to offer only "Try again" (the lab). */
  onContinue?: () => void;
  continueLabel?: string;
  /** Called once when the answer is checked (lessons record it and adjust hearts). */
  onCheck?: (score: Score) => void;
  /** Offer "Try again" after checking. Lessons turn it off: a miss comes back later instead. */
  allowRetry?: boolean;
}

export function QuestionCard({
  question,
  onContinue,
  continueLabel = 'Continue',
  onCheck,
  allowRetry = true,
}: Props) {
  const uid = useId().replace(/:/g, '');
  const { answer, layout, phase, score, complete, updateAnswer, check, retry } =
    useAttempt(question);
  const revealed = phase === 'revealed';
  const feedbackRef = useRef<HTMLElement>(null);
  const [status, setStatus] = useState('');
  const [nudge, setNudge] = useState(false);

  // After checking, bring the feedback into view and move focus there for screen readers.
  useEffect(() => {
    if (!revealed) return;
    const el = feedbackRef.current;
    el?.focus({ preventScroll: true });
    el?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
  }, [revealed]);

  const tryCheck = () => {
    if (complete) {
      setNudge(false);
      check();
      onCheck?.(scoreAnswer(question, answer));
    } else {
      setNudge(true);
      setStatus(`Not finished: ${progressText(question, answer).toLowerCase()}.`);
    }
  };

  const primary = () => (revealed ? (onContinue ?? retry)() : tryCheck());

  // Enter checks or continues (option letters live in QuestionBody).
  const primaryRef = useRef(primary);
  useEffect(() => {
    primaryRef.current = primary;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (isTypingTarget(e.target) || dialogOpen()) return;
      // Let a focused button or link do its own thing.
      if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement) return;
      e.preventDefault();
      primaryRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <article className={styles.card} aria-labelledby={`${uid}-stem`}>
      <QuestionBody
        question={question}
        answer={answer}
        layout={layout}
        onChange={updateAnswer}
        revealed={revealed}
        uid={uid}
        onStatus={setStatus}
      />

      {revealed && score && <Feedback ref={feedbackRef} question={question} score={score} />}

      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>

      <div
        className={styles.bar}
        data-phase={phase}
        data-verdict={score ? verdictOf(score) : undefined}
      >
        <div className={styles.barInner}>
          {revealed && score ? (
            <p className={styles.barVerdict}>
              <span className={styles.barIcon}>
                <VerdictIcon score={score} />
              </span>
              {/* Long form for wide screens and screen readers; the score alone on narrow ones. */}
              <span className={styles.verdictLong}>{verdictText(score)}</span>
              <span className={styles.verdictShort} aria-hidden="true">
                {verdictOf(score) === 'partial'
                  ? `${score.earned} of ${score.possible}`
                  : verdictText(score)}
              </span>
            </p>
          ) : (
            <p className={styles.barProgress} data-nudge={nudge && !complete ? '' : undefined}>
              {progressText(question, answer)}
            </p>
          )}
          <div className={styles.barActions}>
            {revealed && onContinue && allowRetry && (
              <button type="button" className={styles.secondary} onClick={retry}>
                <RetryIcon />
                <span className={styles.collapsible}>Try again</span>
              </button>
            )}
            <button
              type="button"
              className={styles.primary}
              aria-disabled={!revealed && !complete ? true : undefined}
              onClick={primary}
            >
              {revealed ? (onContinue ? continueLabel : 'Try again') : 'Check'}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
