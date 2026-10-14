/** One Yes / No choice per statement, each a native radio pair so arrow keys switch between them. */
import { CheckIcon, CrossIcon } from '@/ui/icons';
import { InlineText } from '@/ui/RichText';
import type { RendererProps } from './types';
import styles from './YesNo.module.css';

const OPTIONS = [
  { value: true, label: 'Yes' },
  { value: false, label: 'No' },
] as const;

export function YesNo({ question, answer, onChange, revealed, uid }: RendererProps<'yesno'>) {
  const set = (index: number, value: boolean) =>
    onChange((prev) => ({ ...prev, values: prev.values.map((v, i) => (i === index ? value : v)) }));

  return (
    <ol className={styles.list}>
      {question.statements.map((statement, i) => {
        const value = answer.values[i] ?? null;
        const expected = question.answer[i];
        const ok = revealed ? value === expected : undefined;
        const textId = `${uid}-st-${i}`;
        return (
          <li
            key={i}
            className={styles.row}
            data-mark={ok === undefined ? undefined : ok ? 'correct' : 'wrong'}
          >
            <p id={textId} className={styles.statement}>
              <InlineText text={statement} />
            </p>
            <div className={styles.toggle} role="radiogroup" aria-labelledby={textId}>
              {OPTIONS.map((opt) => {
                const id = `${uid}-st-${i}-${opt.label}`;
                const chosen = value === opt.value;
                return (
                  <label
                    key={opt.label}
                    htmlFor={id}
                    className={styles.option}
                    data-chosen={chosen || undefined}
                  >
                    <input
                      id={id}
                      className={styles.input}
                      type="radio"
                      name={`${uid}-st-${i}`}
                      checked={chosen}
                      disabled={revealed}
                      onChange={() => set(i, opt.value)}
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>
            {revealed && (
              <p className={styles.mark}>
                {ok ? <CheckIcon /> : <CrossIcon />}
                {ok ? 'Correct' : `Incorrect. The answer is ${expected ? 'Yes' : 'No'}`}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
