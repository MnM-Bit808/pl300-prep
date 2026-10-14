/**
 * One question, end to end: context, stem, exhibit, the answer control for its type, the
 * check bar and the feedback. Used by the lab now, and by lessons, practice and review later
 * (mock exams reuse the renderers without feedback).
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { Question } from '@/bank/schema';
import { Exhibit } from '@/exhibits/Exhibit';
import { RetryIcon } from '@/ui/icons';
import { RichText } from '@/ui/RichText';
import type { Answer } from './answer';
import { Feedback, VerdictIcon } from './Feedback';
import { DIFFICULTY_LABEL, FORMAT_LABEL, verdictText } from './labels';
import { MultiChoice, SingleChoice } from './renderers/ChoiceList';
import { Dropdowns } from './renderers/Dropdowns';
import { OrderBuilder } from './renderers/OrderBuilder';
import { YesNo } from './renderers/YesNo';
import { verdictOf } from './scoring';
import { useAttempt } from './useAttempt';
import styles from './QuestionCard.module.css';

/** What's still needed, in words, shown beside the Check button. */
function progressText(q: Question, a: Answer): string {
  if (q.type === 'multi' && a.type === 'multi')
    return `${a.choices.length} of ${q.selectCount} chosen`;
  if (q.type === 'yesno' && a.type === 'yesno') {
    return `${a.values.filter((v) => v !== null).length} of ${q.statements.length} answered`;
  }
  if (q.type === 'dropdown' && a.type === 'dropdown') {
    return `${a.picks.filter((p) => p !== null).length} of ${q.parts.length} selected`;
  }
  if (q.type === 'order' && a.type === 'order') {
    return a.sequence.length === 1 ? '1 step placed' : `${a.sequence.length} steps placed`;
  }
  return a.type === 'single' && a.choice ? 'Answer chosen' : 'Choose an answer';
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Keys that belong to the focused control, so global shortcuts must leave them alone. */
function isTypingTarget(el: EventTarget | null) {
  return (
    el instanceof HTMLElement &&
    (el.isContentEditable ||
      /^(SELECT|TEXTAREA)$/.test(el.tagName) ||
      (el instanceof HTMLInputElement && !['radio', 'checkbox'].includes(el.type)))
  );
}

/** Render with `key={question.id}`: a new question is a new attempt with fresh state. */
interface Props {
  question: Question;
  /** Shown after checking. Omit to offer only "Try again" (the lab). */
  onContinue?: () => void;
  continueLabel?: string;
}

export function QuestionCard({ question, onContinue, continueLabel = 'Continue' }: Props) {
  const uid = useId().replace(/:/g, '');
  const attempt = useAttempt(question);
  const { answer, layout, phase, score, complete, updateAnswer, check, retry } = attempt;
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
    } else {
      setNudge(true);
      setStatus(`Not finished: ${progressText(question, answer).toLowerCase()}.`);
    }
  };

  const primary = () => (revealed ? (onContinue ?? retry)() : tryCheck());

  // Shortcuts: A–J or 1–9 pick an option (single and multi); Enter checks or continues.
  const primaryRef = useRef(primary);
  useEffect(() => {
    primaryRef.current = primary;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isTypingTarget(e.target))
        return;
      if (document.querySelector('dialog[open]')) return;
      if (e.key === 'Enter') {
        // Let a focused button or link do its own thing.
        if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement) return;
        e.preventDefault();
        primaryRef.current();
        return;
      }
      if (revealed || (question.type !== 'single' && question.type !== 'multi')) return;
      const k = e.key.toUpperCase();
      const index = /^[1-9]$/.test(k)
        ? Number(k) - 1
        : /^[A-J]$/.test(k)
          ? k.charCodeAt(0) - 65
          : -1;
      const input = document.getElementById(`${uid}-opt-${index}`);
      if (input instanceof HTMLInputElement) {
        e.preventDefault();
        input.click();
        input.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [question.type, revealed, uid]);

  const common = { revealed, uid, onStatus: setStatus, layout };
  let body: ReactNode = null;
  if (question.type === 'single' && answer.type === 'single') {
    body = <SingleChoice {...common} question={question} answer={answer} onChange={updateAnswer} />;
  } else if (question.type === 'multi' && answer.type === 'multi') {
    body = <MultiChoice {...common} question={question} answer={answer} onChange={updateAnswer} />;
  } else if (question.type === 'yesno' && answer.type === 'yesno') {
    body = <YesNo {...common} question={question} answer={answer} onChange={updateAnswer} />;
  } else if (question.type === 'order' && answer.type === 'order') {
    body = <OrderBuilder {...common} question={question} answer={answer} onChange={updateAnswer} />;
  } else if (question.type === 'dropdown' && answer.type === 'dropdown') {
    body = <Dropdowns {...common} question={question} answer={answer} onChange={updateAnswer} />;
  }

  const stemId = `${uid}-stem`;

  return (
    <article className={styles.card} aria-labelledby={stemId}>
      <ul className={styles.meta} aria-label="About this question">
        <li className={styles.format}>
          {question.type === 'multi'
            ? `Choose ${question.selectCount}`
            : FORMAT_LABEL[question.type]}
        </li>
        <li>{question.subtopic}</li>
        <li data-difficulty={question.difficulty}>{DIFFICULTY_LABEL[question.difficulty]}</li>
      </ul>

      <div id={stemId} className={styles.stem}>
        <RichText text={question.stem} />
      </div>

      {question.image && <Exhibit image={question.image} label={question.id} breakout />}

      <div className={styles.answers}>{body}</div>

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
            {revealed && onContinue && (
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
