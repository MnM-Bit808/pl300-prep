/**
 * Practice hub: the two queues that matter most (reviews due, mistakes to fix), flashcards, and
 * a custom practice builder. Builder choices live in the URL, so Back restores them.
 */
import { Link, useSearchParams } from 'react-router';
import { DOMAINS } from '@/bank/constants';
import { useBank } from '@/bank/useBank';
import { UNIT_INFO } from '@/learn/course';
import { useProgress, useProgressStore } from '@/progress/hooks';
import { DIFFICULTY_LABEL } from '@/questions/labels';
import buttons from '@/ui/buttons.module.css';
import { filterQuery, parseFilter, parseLength } from './query';
import { dueIds, filterQuestions, isMistake, mistakeIds, outline } from './select';
import styles from './PracticePage.module.css';
import { useDocumentTitle } from '@/app/title';

const LENGTHS = [10, 20, 0] as const; // 0 = all

export function PracticePage() {
  useDocumentTitle('Practice');
  const bank = useBank();
  const doc = useProgress();
  const [params, setParams] = useSearchParams();
  const today = useProgressStore().today();

  const due = dueIds(bank, doc, today);
  const mistakes = mistakeIds(bank, doc);
  const nextDue = Object.values(doc.srs)
    .map((c) => c.due)
    .filter((d) => d > today)
    .sort()[0];

  // Custom practice filter, from the URL.
  const { domain, topic, subtopic, difficulties = [] } = parseFilter(params);
  const length = parseLength(params);

  const topics = outline(
    domain ? bank.questions.filter((q) => q.domain === domain) : bank.questions,
  );
  const subtopics = topic ? [...(topics.get(topic)?.subtopics ?? new Map<string, number>())] : [];
  const matching = filterQuestions(bank.questions, { domain, topic, subtopic, difficulties });
  const seen = matching.filter((q) => doc.questions[q.id]).length;
  const toFix = matching.filter((q) => isMistake(doc, q.id)).length;
  const runSize = length === 0 ? matching.length : Math.min(length, matching.length);

  const set = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true });
  };

  const toggleDifficulty = (d: 1 | 2 | 3) => {
    const next = difficulties.includes(d)
      ? difficulties.filter((x) => x !== d)
      : [...difficulties, d];
    set({ d: next.sort().join(',') || undefined });
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Practice</h1>

      <section className={styles.queues} aria-label="Your review queues">
        <article className={styles.queue}>
          <h2>Review</h2>
          <p className={styles.big}>
            <strong>{due.length}</strong> due today
          </p>
          <p className={styles.note}>
            {due.length
              ? 'Questions you answered before, back on a spaced schedule so they stick.'
              : nextDue
                ? `Nothing due. Next review on ${formatDay(nextDue)}.`
                : 'Questions appear here after you answer them in a lesson or practice.'}
          </p>
          {due.length > 0 && (
            <Link to="/practice/run?mode=review" className={buttons.primary}>
              Start review
            </Link>
          )}
        </article>

        <article className={styles.queue}>
          <h2>Fix mistakes</h2>
          <p className={styles.big}>
            <strong>{mistakes.length}</strong> to fix
          </p>
          <p className={styles.note}>
            {mistakes.length
              ? 'Questions you missed on a first try, newest first. Get one right in a later run and it leaves the list.'
              : 'No mistakes waiting. Anything you miss lands here.'}
          </p>
          {mistakes.length > 0 && (
            <Link to="/practice/run?mode=mistakes" className={buttons.primary}>
              Fix mistakes
            </Link>
          )}
        </article>
      </section>

      <section className={styles.builder} aria-labelledby="custom">
        <h2 id="custom">Custom practice</h2>
        <p className={styles.note}>Pick a domain, topic or subtopic, and how hard.</p>

        <div className={styles.fields}>
          <label className={styles.field}>
            <span>Domain</span>
            <select
              value={domain ?? ''}
              onChange={(e) =>
                set({ domain: e.target.value || undefined, topic: undefined, subtopic: undefined })
              }
            >
              <option value="">All domains</option>
              {DOMAINS.map((d) => (
                <option key={d} value={d}>
                  {UNIT_INFO[d].title}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Topic</span>
            <select
              value={topic ?? ''}
              onChange={(e) => set({ topic: e.target.value || undefined, subtopic: undefined })}
            >
              <option value="">All topics</option>
              {[...topics].map(([name, t]) => (
                <option key={name} value={name}>
                  {name} ({t.count})
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Subtopic</span>
            <select
              value={subtopic ?? ''}
              disabled={!topic}
              onChange={(e) => set({ subtopic: e.target.value || undefined })}
            >
              <option value="">{topic ? 'All subtopics' : 'Choose a topic first'}</option>
              {subtopics.map(([name, n]) => (
                <option key={name} value={name}>
                  {name} ({n})
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className={styles.chips}>
          <legend>Difficulty</legend>
          {([1, 2, 3] as const).map((d) => (
            <label key={d} className={styles.chip} data-choice>
              <input
                type="checkbox"
                checked={difficulties.includes(d)}
                onChange={() => toggleDifficulty(d)}
              />
              {DIFFICULTY_LABEL[d]}
            </label>
          ))}
          <span className={styles.hint}>{difficulties.length ? '' : 'None picked means all.'}</span>
        </fieldset>

        <fieldset className={styles.chips}>
          <legend>Questions</legend>
          {LENGTHS.map((n) => (
            <label key={n} className={styles.chip} data-choice>
              <input
                type="radio"
                name="length"
                checked={length === n}
                onChange={() => set({ n: n === 10 ? undefined : String(n) })}
              />
              {n === 0 ? 'All' : n}
            </label>
          ))}
        </fieldset>

        <p className={styles.summary} aria-live="polite">
          <strong>{matching.length}</strong> questions match. You’ve answered {seen}
          {toFix ? `, and ${toFix} need fixing` : ''}.
        </p>

        <div className={styles.actions}>
          {matching.length > 0 ? (
            <Link
              to={`/practice/run?${filterQuery(params, { mode: 'custom', n: String(length) })}`}
              className={buttons.primary}
            >
              Practise {runSize} {runSize === 1 ? 'question' : 'questions'}
            </Link>
          ) : (
            <p className={styles.note}>No questions match. Loosen the filter.</p>
          )}
          <Link to={`/practice/cards?${filterQuery(params, {})}`} className={buttons.secondary}>
            Flashcards for this selection
          </Link>
        </div>
      </section>
    </div>
  );
}

function formatDay(day: string) {
  return new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
