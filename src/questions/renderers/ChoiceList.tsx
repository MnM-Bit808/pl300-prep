/**
 * Single and multi choice. Native radio / checkbox inputs sit inside each tile, so arrow keys,
 * Space, form semantics and screen-reader announcements all come from the platform.
 */
import { CheckIcon, CrossIcon } from '@/ui/icons';
import { InlineText } from '@/ui/RichText';
import { LETTERS, type RendererProps } from './types';
import styles from './ChoiceList.module.css';

type Mark = 'correct' | 'missed' | 'wrong' | undefined;

function markFor(revealed: boolean, isAnswer: boolean, chosen: boolean): Mark {
  if (!revealed) return undefined;
  if (isAnswer) return chosen ? 'correct' : 'missed';
  return chosen ? 'wrong' : undefined;
}

const MARK_TEXT: Record<NonNullable<Mark>, string> = {
  correct: 'Your answer, correct',
  missed: 'Correct answer',
  wrong: 'Your answer, incorrect',
};

interface ChoiceTileProps {
  uid: string;
  index: number;
  kind: 'radio' | 'checkbox';
  text: string;
  chosen: boolean;
  mark: Mark;
  revealed: boolean;
  blocked: boolean;
  onToggle: () => void;
}

function ChoiceTile({
  uid,
  index,
  kind,
  text,
  chosen,
  mark,
  revealed,
  blocked,
  onToggle,
}: ChoiceTileProps) {
  const id = `${uid}-opt-${index}`;
  return (
    <li>
      <label
        className={styles.tile}
        htmlFor={id}
        data-chosen={chosen || undefined}
        data-mark={mark}
      >
        <input
          id={id}
          className={styles.input}
          type={kind}
          name={uid}
          checked={chosen}
          disabled={revealed}
          aria-disabled={blocked || undefined}
          aria-describedby={mark ? `${id}-mark` : undefined}
          onChange={onToggle}
        />
        <span className={styles.key} aria-hidden="true">
          {LETTERS[index]}
        </span>
        <span className={styles.text}>
          <InlineText text={text} />
        </span>
        {mark && (
          <span id={`${id}-mark`} className={styles.mark}>
            {mark === 'wrong' ? <CrossIcon /> : <CheckIcon />}
            <span className={styles.markText}>{MARK_TEXT[mark]}</span>
          </span>
        )}
      </label>
    </li>
  );
}

export function SingleChoice({
  question,
  answer,
  layout,
  onChange,
  revealed,
  uid,
}: RendererProps<'single'>) {
  const byId = new Map(question.options.map((o) => [o.id, o]));
  return (
    <fieldset className={styles.fieldset}>
      <legend className="sr-only">Choose one answer</legend>
      <ul className={styles.list}>
        {layout.order.map((id, i) => (
          <ChoiceTile
            key={id}
            uid={uid}
            index={i}
            kind="radio"
            text={byId.get(id)?.text ?? ''}
            chosen={answer.choice === id}
            mark={markFor(revealed, question.answer === id, answer.choice === id)}
            revealed={revealed}
            blocked={false}
            onToggle={() => onChange((prev) => ({ ...prev, choice: id }))}
          />
        ))}
      </ul>
    </fieldset>
  );
}

export function MultiChoice({
  question,
  answer,
  layout,
  onChange,
  revealed,
  uid,
  onStatus,
}: RendererProps<'multi'>) {
  const byId = new Map(question.options.map((o) => [o.id, o]));
  const full = answer.choices.length >= question.selectCount;

  const limit = question.selectCount;
  const toggle = (id: string) => {
    if (full && !answer.choices.includes(id)) {
      onStatus?.(`You've chosen ${limit}. Clear one to pick another.`);
      return;
    }
    onChange((prev) => {
      if (prev.choices.includes(id))
        return { ...prev, choices: prev.choices.filter((c) => c !== id) };
      return prev.choices.length < limit ? { ...prev, choices: [...prev.choices, id] } : prev;
    });
  };

  return (
    <fieldset className={styles.fieldset}>
      <legend className="sr-only">Choose {question.selectCount} answers</legend>
      <ul className={styles.list}>
        {layout.order.map((id, i) => {
          const chosen = answer.choices.includes(id);
          return (
            <ChoiceTile
              key={id}
              uid={uid}
              index={i}
              kind="checkbox"
              text={byId.get(id)?.text ?? ''}
              chosen={chosen}
              mark={markFor(revealed, question.answer.includes(id), chosen)}
              revealed={revealed}
              blocked={full && !chosen}
              onToggle={() => toggle(id)}
            />
          );
        })}
      </ul>
    </fieldset>
  );
}
