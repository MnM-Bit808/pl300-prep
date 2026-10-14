/**
 * Question lab (test page): one question of each format plus the case studies, with controls to
 * step through every question in a group or jump to any id. State lives in the URL (?type=&id=) so a
 * specific question can be linked to in a bug report.
 */
import { useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { QUESTION_TYPES, type QuestionType } from '@/bank/schema';
import { useBank } from '@/bank/useBank';
import { CaseFrame } from '@/case/CaseFrame';
import { FORMAT_LABEL } from '@/questions/labels';
import { QuestionCard } from '@/questions/QuestionCard';
import { ArrowLeftIcon, ArrowRightIcon } from '@/ui/icons';
import styles from './QuestionLab.module.css';

/** Start each format on a question that exercises the most: exhibits, code, distractors. */
type Group = QuestionType | 'case';
const GROUPS: readonly Group[] = [...QUESTION_TYPES, 'case'];
const GROUP_LABEL = (g: Group) => (g === 'case' ? 'Case studies' : FORMAT_LABEL[g]);

const SAMPLES: Record<Group, string> = {
  case: 'CASE-001',
  single: 'PRE-076',
  multi: 'MOD-045',
  yesno: 'VIS-082',
  order: 'PRE-012',
  dropdown: 'MOD-002',
};

const isGroup = (v: string | null): v is Group => GROUPS.includes(v as Group);

export function QuestionLab() {
  const bank = useBank();
  const [params, setParams] = useSearchParams();
  const [jump, setJump] = useState('');
  const [jumpError, setJumpError] = useState('');

  const byType = useMemo(() => {
    const groups = Object.fromEntries(GROUPS.map((g) => [g, [] as string[]])) as Record<
      Group,
      string[]
    >;
    for (const q of bank.questions) {
      groups[q.type].push(q.id);
      if (q.caseId) groups.case.push(q.id);
    }
    return groups;
  }, [bank]);

  const requested = params.get('id');
  const fromId = requested ? bank.questionById.get(requested) : undefined;
  const asked = params.get('type');
  const type: Group =
    asked === 'case' && fromId?.caseId
      ? 'case'
      : (fromId?.type ?? (isGroup(asked) ? asked : 'single'));
  const ids = byType[type];
  const id = fromId?.id ?? (bank.questionById.has(SAMPLES[type]) ? SAMPLES[type] : ids[0]);
  const question = id ? bank.questionById.get(id) : undefined;
  const index = id ? ids.indexOf(id) : -1;

  const go = (next: { type?: Group; id?: string }) => {
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
    go({ type: target.caseId ? 'case' : target.type, id: target.id });
  };

  const caseStudy = question?.caseId ? bank.caseById.get(question.caseId) : undefined;
  const caseIds = caseStudy
    ? bank.questions.filter((q) => q.caseId === caseStudy.id).map((q) => q.id)
    : [];
  const casePosition =
    caseStudy && question
      ? `Question ${caseIds.indexOf(question.id) + 1} of ${caseIds.length} in this case`
      : undefined;
  const card = question && (
    <QuestionCard
      key={question.id}
      question={question}
      onContinue={() => step(1)}
      continueLabel="Next"
    />
  );

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
        {GROUPS.map((t) => (
          <button
            key={t}
            type="button"
            className={styles.format}
            aria-pressed={t === type}
            onClick={() => go({ type: t })}
          >
            {GROUP_LABEL(t)}
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
        caseStudy ? (
          <CaseFrame key={caseStudy.id} caseStudy={caseStudy} position={casePosition}>
            {card}
          </CaseFrame>
        ) : (
          card
        )
      ) : (
        <p>No questions of this format are in the bank.</p>
      )}
    </div>
  );
}
