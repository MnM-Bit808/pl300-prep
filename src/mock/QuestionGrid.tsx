/** The question map: one numbered tile per question, showing answered, part answered or not,
 * and marked for review. Used in the map dialog and on the section review screen. */
import type { Bank } from '@/bank/load';
import { FlagIcon } from '@/ui/icons';
import { tileState, type ExamState, type TileState } from './exam';
import styles from './QuestionGrid.module.css';

const STATE_TEXT: Record<TileState, string> = {
  answered: 'answered',
  partial: 'part answered',
  empty: 'not answered',
};

interface Props {
  bank: Bank;
  state: ExamState;
  ids: readonly string[];
  current?: number | undefined;
  onPick: (index: number) => void;
}

export function QuestionGrid({ bank, state, ids, current, onPick }: Props) {
  return (
    <ol className={styles.grid}>
      {ids.map((id, i) => {
        const t = tileState(bank, state, id);
        const marked = state.marked.includes(id);
        return (
          <li key={id}>
            <button
              type="button"
              className={styles.tile}
              data-state={t}
              data-current={i === current || undefined}
              aria-current={i === current ? 'step' : undefined}
              aria-label={`Question ${i + 1}, ${STATE_TEXT[t]}${marked ? ', marked for review' : ''}`}
              onClick={() => onPick(i)}
            >
              {i + 1}
              {marked && <FlagIcon className={styles.flag} />}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function GridLegend() {
  return (
    <ul className={styles.legend} aria-label="Key">
      <li>
        <span className={styles.swatch} data-state="answered" /> Answered
      </li>
      <li>
        <span className={styles.swatch} data-state="partial" /> Part answered
      </li>
      <li>
        <span className={styles.swatch} data-state="empty" /> Not answered
      </li>
      <li>
        <FlagIcon className={styles.legendFlag} /> Marked for review
      </li>
    </ul>
  );
}
