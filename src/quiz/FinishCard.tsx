/** End-of-run summary: what you did, what you earned, where to go next. */
import { useEffect, useRef, type ReactNode } from 'react';
import styles from './FinishCard.module.css';

interface Props {
  /** Small line above the heading: the lesson or practice name. */
  context: string;
  title: string;
  tone: 'good' | 'bad' | 'neutral';
  text: string;
  stats: { label: string; value: string }[];
  /** Primary action first. */
  actions: ReactNode;
  children?: ReactNode;
}

export function FinishCard({ context, title, tone, text, stats, actions, children }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Move focus to the result so keyboard and screen-reader users land on it.
  useEffect(() => headingRef.current?.focus(), []);

  return (
    <main id="main" className={styles.finish} data-tone={tone}>
      <div className={styles.card}>
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
