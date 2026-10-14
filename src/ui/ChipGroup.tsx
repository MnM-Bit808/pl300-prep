/** A single-choice group drawn as chips: real radio inputs, so arrow keys and screen readers
 * work as they do for any radio group. */
import { useId, type ReactNode } from 'react';
import styles from './ChipGroup.module.css';

interface Option<T extends string> {
  value: T;
  label: ReactNode;
}

interface Props<T extends string> {
  legend: string;
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
  /** Hide the legend visually (it stays for screen readers). */
  quietLegend?: boolean;
}

export function ChipGroup<T extends string>({
  legend,
  value,
  options,
  onChange,
  quietLegend = false,
}: Props<T>) {
  const name = useId();
  return (
    <fieldset className={styles.group}>
      <legend className={quietLegend ? 'sr-only' : styles.legend}>{legend}</legend>
      <div className={styles.chips}>
        {options.map((o) => (
          <label key={o.value} className={styles.chip} data-choice>
            <input
              type="radio"
              name={name}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
