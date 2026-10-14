/**
 * Question lab (Step 3 test page): one question of each format, with controls to step through
 * every question of that format or jump to any id. State lives in the URL (?type=&id=) so a
 * specific question can be linked to in a bug report.
 */
import { useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { QUESTION_TYPES, type QuestionType } from '@/bank/schema';
import { useBank } from '@/bank/useBank';
import { FORMAT_LABEL } from '@/questions/labels';
import { QuestionCard } from '@/questions/QuestionCard';
import { ArrowLeftIcon, ArrowRightIcon } from '@/ui/icons';
import styles from './QuestionLab.module.css';

/** Start each format on a question that exercises the most: exhibits, code, distractors. */
const SAMPLES: Record<QuestionType, string> = {
  single: 'PRE-076',
  multi: 'MOD-045',
  yesno: 'VIS-082',
  order: 'PRE-012',
  dropdown: 'MOD-002',
};

const isType = (v: string | null): v is QuestionType => QUESTION_TYPES.includes(v as QuestionType);

export function QuestionLab() {
  const bank = useBank();
  const [params, setParams] = useSearchParams();
  const [jump, setJump] = useState('');
  const [jumpError, setJumpError] = useState('');

  const byType = useMemo(() => {
    const groups = Object.fromEntries(QUESTION_TYPES.map((t) => [t, [] as string[]])) as Record<
      QuestionType,
      string[]
    >;
    for (const q of bank.questions) groups[q.type].push(q.id);
    return groups;
  }, [bank]);

  const requested = params.get('id');
  const fromId = requested ? bank.questionById.get(requested) : undefined;
  const type: QuestionType =
    fromId?.type ?? (isType(params.get('type')) ? (params.get('type') as QuestionType) : 'single');
  const ids = byType[type];
  const id = fromId?.id ?? (bank.questionById.has(SAMPLES[type]) ? SAMPLES[type] : ids[0]);
  const question = id ? bank.questionById.get(id) : undefined;
  const index = id ? ids.indexOf(id) : -1;

  const go = (next: { type?: QuestionType; id?: string }) => {
    const p = new URLSearchParams();
    p.set('type', next.type ?? type);
    if (next.id) p.set('id', next.id);
    setParams(p);
    window.scrollTo({ top: 0 });
  };

  const step = (delta: number) => {
    const nextId = ids[(index + delta + ids.length) % ids.length];
    if (nextId) go({ id: nextId });
  };

  const onJump = (e: FormEvent) => {
    e.preventDefault();
    const target = bank.questionById.get(jump.trim().toUpperCase());
    if (!target) {
      setJumpError(`No question with the id "${jump.trim()}".`);
      return;
    }
    setJumpError('');
    setJump('');
    go({ type: target.type, id: target.id });
  };

  return (
    <div className={styles.lab}>
      <header className={styles.intro}>
        <h1>Question lab</h1>
        <p>
          Every answer format in the bank. Answer, check, and step through all{' '}
          {bank.questions.length} questions.
        </p>
      </header>

      <nav className={styles.formats} aria-label="Answer formats">
        {QUESTION_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            className={styles.format}
            aria-pressed={t === type}
            onClick={() => go({ type: t })}
          >
            {FORMAT_LABEL[t]}
            <span className={styles.count}>{byType[t].length}</span>
          </button>
        ))}
      </nav>

      <div className={styles.stepper}>
        <button
          type="button"
          className={styles.stepBtn}
          onClick={() => step(-1)}
          aria-label="Previous question"
        >
          <ArrowLeftIcon />
        </button>
        <p className={styles.position}>
          <strong>{question?.id}</strong>
          <span>
            {index + 1} of {ids.length}
          </span>
        </p>
        <button
          type="button"
          className={styles.stepBtn}
          onClick={() => step(1)}
          aria-label="Next question"
        >
          <ArrowRightIcon />
        </button>
        <form className={styles.jump} onSubmit={onJump}>
          <label htmlFor="jump" className="sr-only">
            Go to question id
          </label>
          <input
            id="jump"
            value={jump}
            onChange={(e) => setJump(e.target.value)}
            placeholder="Go to id, e.g. MOD-040"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={jumpError ? true : undefined}
            aria-describedby={jumpError ? 'jump-error' : undefined}
          />
          <button type="submit">Go</button>
        </form>
      </div>
      {jumpError && (
        <p id="jump-error" className={styles.error} role="alert">
          {jumpError}
        </p>
      )}

      {question ? (
        <QuestionCard
          key={question.id}
          question={question}
          onContinue={() => step(1)}
          continueLabel="Next"
        />
      ) : (
        <p>No questions of this format are in the bank.</p>
      )}
    </div>
  );
}
