import type { Ref } from 'react';
import type { Question } from '@/bank/schema';
import { CheckIcon, CrossIcon, HalfIcon } from '@/ui/icons';
import { InlineText, RichText } from '@/ui/RichText';
import { verdictText } from './labels';
import { verdictOf, type Score } from './scoring';
import styles from './Feedback.module.css';

export const VerdictIcon = ({ score }: { score: Score }) => {
  const v = verdictOf(score);
  return v === 'correct' ? <CheckIcon /> : v === 'partial' ? <HalfIcon /> : <CrossIcon />;
};

/** The correct sequence for order questions, which the per-slot marks alone don't show. */
function CorrectSequence({ question }: { question: Question }) {
  if (question.type !== 'order') return null;
  const textOf = new Map(question.items.map((i) => [i.id, i.text]));
  return (
    <div className={styles.sequence}>
      <h3 className={styles.subhead}>Correct order</h3>
      <ol>
        {question.answer.map((id) => (
          <li key={id}>
            <InlineText text={textOf.get(id) ?? ''} />
          </li>
        ))}
      </ol>
    </div>
  );
}

interface Props {
  question: Question;
  score: Score;
  ref?: Ref<HTMLElement>;
}

/** Shown after checking: verdict, explanation, and the takeaway as a formula bar. */
export function Feedback({ question, score, ref }: Props) {
  const verdict = verdictOf(score);
  return (
    <section
      ref={ref}
      className={styles.feedback}
      data-verdict={verdict}
      tabIndex={-1}
      aria-labelledby={`${question.id}-verdict`}
    >
      <h2 id={`${question.id}-verdict`} className={styles.verdict}>
        <span className={styles.verdictIcon}>
          <VerdictIcon score={score} />
        </span>
        {verdictText(score)}
      </h2>

      <CorrectSequence question={question} />

      <RichText text={question.explanation} className={styles.explanation} />

      <div className={styles.takeaway}>
        <span className={styles.fx} aria-hidden="true">
          fx
        </span>
        <p className={styles.rule}>
          <span className="sr-only">Rule to remember: </span>
          <mark className={styles.mark}>
            <InlineText text={question.takeaway} />
          </mark>
        </p>
      </div>
    </section>
  );
}
