/**
 * A question without its frame: context chips, stem, exhibit and the answer control for its
 * type, plus the A–J / 1–9 option shortcuts. QuestionCard adds checking and feedback; the mock
 * exam and its results review use the body directly with their own controls.
 */
import { useEffect, type ReactNode } from 'react';
import type { Question } from '@/bank/schema';
import { Exhibit } from '@/exhibits/Exhibit';
import { dialogOpen, isTypingTarget } from '@/lib/keys';
import { RichText } from '@/ui/RichText';
import type { Answer, AnswerUpdater, Layout } from './answer';
import { DOMAIN_SHORT } from '@/bank/constants';
import { DomainIcon } from '@/ui/domains';
import { DIFFICULTY_LABEL, FORMAT_LABEL } from './labels';
import { MultiChoice, SingleChoice } from './renderers/ChoiceList';
import { Dropdowns } from './renderers/Dropdowns';
import { OrderBuilder } from './renderers/OrderBuilder';
import { YesNo } from './renderers/YesNo';
import styles from './QuestionCard.module.css';

interface Props {
  question: Question;
  answer: Answer;
  layout: Layout;
  onChange: AnswerUpdater;
  revealed: boolean;
  uid: string;
  onStatus?: (message: string) => void;
  /** 'full' shows subtopic and difficulty; 'format' only the answer format (the exam doesn't
   * hint at the topic). */
  meta?: 'full' | 'format';
}

export function QuestionBody({
  question,
  answer,
  layout,
  onChange,
  revealed,
  uid,
  onStatus,
  meta = 'full',
}: Props) {
  // A–J or 1–9 pick an option by screen position (single and multi).
  useEffect(() => {
    if (revealed || (question.type !== 'single' && question.type !== 'multi')) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (isTypingTarget(e.target) || dialogOpen()) return;
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

  const common = { revealed, uid, layout, onChange, ...(onStatus ? { onStatus } : {}) };
  let control: ReactNode = null;
  if (question.type === 'single' && answer.type === 'single') {
    control = <SingleChoice {...common} question={question} answer={answer} />;
  } else if (question.type === 'multi' && answer.type === 'multi') {
    control = <MultiChoice {...common} question={question} answer={answer} />;
  } else if (question.type === 'yesno' && answer.type === 'yesno') {
    control = <YesNo {...common} question={question} answer={answer} />;
  } else if (question.type === 'order' && answer.type === 'order') {
    control = <OrderBuilder {...common} question={question} answer={answer} />;
  } else if (question.type === 'dropdown' && answer.type === 'dropdown') {
    control = <Dropdowns {...common} question={question} answer={answer} />;
  }

  return (
    <>
      <ul className={styles.meta} aria-label="About this question">
        <li className={styles.format}>
          {question.type === 'multi'
            ? `Choose ${question.selectCount}`
            : FORMAT_LABEL[question.type]}
        </li>
        {meta === 'full' && (
          <>
            <li className={styles.domain} data-domain={question.domain}>
              <DomainIcon domain={question.domain} />
              {DOMAIN_SHORT[question.domain]}
            </li>
            <li>{question.subtopic}</li>
            <li data-difficulty={question.difficulty}>{DIFFICULTY_LABEL[question.difficulty]}</li>
          </>
        )}
      </ul>

      <div id={`${uid}-stem`} className={styles.stem}>
        <RichText text={question.stem} />
      </div>

      {question.image && <Exhibit image={question.image} label={question.id} breakout />}

      <div className={styles.answers}>{control}</div>
    </>
  );
}
