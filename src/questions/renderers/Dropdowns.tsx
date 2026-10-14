/** One native <select> per part: the platform picker is the most usable control on a phone. */
import { CheckIcon, ChevronDownIcon, CrossIcon } from '@/ui/icons';
import type { RendererProps } from './types';
import styles from './Dropdowns.module.css';

export function Dropdowns({
  question,
  answer,
  onChange,
  revealed,
  uid,
}: RendererProps<'dropdown'>) {
  const set = (index: number, pick: number | null) =>
    onChange((prev) => ({ ...prev, picks: prev.picks.map((p, i) => (i === index ? pick : p)) }));

  return (
    <ol className={styles.list}>
      {question.parts.map((part, i) => {
        const id = `${uid}-part-${i}`;
        const pick = answer.picks[i] ?? null;
        const expected = question.answer.parts[i] ?? -1;
        const ok = revealed ? pick === expected : undefined;
        return (
          <li
            key={i}
            className={styles.row}
            data-mark={ok === undefined ? undefined : ok ? 'correct' : 'wrong'}
          >
            <label htmlFor={id} className={styles.label}>
              {part.label}
            </label>
            <div className={styles.selectWrap}>
              <select
                id={id}
                className={styles.select}
                value={pick === null ? '' : String(pick)}
                disabled={revealed}
                data-empty={pick === null || undefined}
                aria-describedby={revealed ? `${id}-mark` : undefined}
                onChange={(e) => set(i, e.target.value === '' ? null : Number(e.target.value))}
              >
                <option value="" disabled>
                  Select…
                </option>
                {part.options.map((text, j) => (
                  <option key={j} value={j}>
                    {text}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className={styles.chevron} />
            </div>
            {revealed && (
              <p id={`${id}-mark`} className={styles.mark}>
                {ok ? <CheckIcon /> : <CrossIcon />}
                {ok ? 'Correct' : `Incorrect. The answer is ${part.options[expected] ?? ''}`}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
