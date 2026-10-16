/**
 * End-of-run summary: what you did, what you earned, where to go next. Googly reacts to the
 * result, and a finished lesson gets confetti.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { Confetti } from '@/ui/Confetti';
import { Googly, type Mood, type Move } from '@/ui/Googly';
import styles from './FinishCard.module.css';

type Tone = 'good' | 'bad' | 'neutral';
const MOOD: Record<Tone, Mood> = { good: 'happy', bad: 'oops', neutral: 'idle' };
const MOVE: Record<Tone, Move> = { good: 'hop', bad: 'wobble', neutral: 'pop' };

interface Props {
  /** Small line above the heading: the lesson or practice name. */
  context: string;
  title: string;
  tone: Tone;
  text: string;
  stats: { label: string; value: string }[];
  /** Primary action first. */
  actions: ReactNode;
  /** Confetti from Googly (a finished lesson, a perfect run). */
  celebrate?: boolean;
  children?: ReactNode;
}

export function FinishCard({
  context,
  title,
  tone,
  text,
  stats,
  actions,
  celebrate,
  children,
}: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const markRef = useRef<HTMLSpanElement>(null);
  // Move focus to the result so keyboard and screen-reader users land on it.
  useEffect(() => headingRef.current?.focus(), []);

  return (
    <main id="main" className={styles.finish} data-tone={tone}>
      <div className={styles.card}>
        <span ref={markRef} className={styles.mark}>
          <Googly mood={MOOD[tone]} move={MOVE[tone]} blink={tone !== 'bad'} />
        </span>
        {celebrate && <Confetti from={markRef} />}
        <p className={styles.context}>{context}</p>
        <h1 ref={headingRef} tabIndex={-1} className={styles.title}>
          {title}
        </h1>
        <p className={styles.text}>{text}</p>
        <dl className={styles.stats}>
          {stats.map((s) => (
            <div key={s.label}>
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>
        {children}
        <div className={styles.actions}>{actions}</div>
      </div>
    </main>
  );
}
