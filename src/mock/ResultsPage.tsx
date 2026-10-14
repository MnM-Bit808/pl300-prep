/**
 * Mock exam results (BUILD_PROMPT 4.5): estimated score out of 1,000, per-domain percentages,
 * and every question with your answer, the right one and the explanation, filterable to the
 * ones that weren't fully correct.
 */
import { useId, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { useBank } from '@/bank/useBank';
import { UNIT_INFO } from '@/learn/course';
import { formatDate, formatDuration } from '@/lib/dates';
import { useProgress } from '@/progress/hooks';
import type { MockRecord } from '@/progress/store';
import { emptyAnswer, layoutFor } from '@/questions/answer';
import { Feedback, VerdictIcon } from '@/questions/Feedback';
import { verdictText } from '@/questions/labels';
import { QuestionBody } from '@/questions/QuestionBody';
import { CheckIcon, CrossIcon, FlagIcon } from '@/ui/icons';
import buttons from '@/ui/buttons.module.css';
import { QuestionTools } from '@/workings/QuestionTools';
import { EXAM_DOMAINS, PASS_MARK } from './build';
import { fullyCorrect, scoreQuestions, type QuestionResult } from './score';
import styles from './ResultsPage.module.css';

type Filter = 'all' | 'missed' | 'marked';

export function ResultsPage() {
  const { id } = useParams();
  const doc = useProgress();
  const record = doc.mocks.find((m) => m.id === id);
  if (!record) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Result not found</h1>
        <p>This mock isn’t in your history on this device.</p>
        <Link to="/mock">Back to Mock exam</Link>
      </div>
    );
  }
  return <Results record={record} />;
}

function Results({ record }: { record: MockRecord }) {
  const bank = useBank();
  const location = useLocation();
  const [filter, setFilter] = useState<Filter>('all');
  const results = useMemo(
    () => scoreQuestions(bank, record.sections, record.answers),
    [bank, record],
  );
  const { score } = record;
  const missed = results.filter((r) => !fullyCorrect(r));
  const marked = results.filter((r) => record.marked.includes(r.questionId));
  const shown = filter === 'missed' ? missed : filter === 'marked' ? marked : results;
  const duration = Date.parse(record.submittedAt) - Date.parse(record.startedAt);
  const justTimedOut = (location.state as { timedOut?: boolean } | null)?.timedOut;

  return (
    <div className={styles.page}>
      {justTimedOut && (
        <p className={styles.banner} role="status">
          Time’s up: the exam was submitted automatically.
        </p>
      )}

      <header className={styles.hero} data-pass={score.passed || undefined}>
        <p className={styles.context}>Mock exam, {formatDate(record.submittedAt)}</p>
        <h1 className={styles.scoreLine}>
          <span className={styles.score}>{score.scaled}</span>
          <span className={styles.outOf}>out of 1,000</span>
        </h1>
        <p className={styles.verdict}>
          {score.passed ? <CheckIcon /> : <CrossIcon />}
          {score.passed ? 'Pass' : `Below the pass mark of ${PASS_MARK}`}
        </p>
        <ScoreScale value={score.scaled} />
        <p className={styles.estimate}>
          An estimate: your share of marks scaled to 1,000. Microsoft doesn’t publish how it scales
          real PL-300 scores.
        </p>
        <dl className={styles.facts}>
          <div>
            <dt>Marks</dt>
            <dd>
              {round1(score.marks)} of {score.total}
            </dd>
          </div>
          <div>
            <dt>Time used</dt>
            <dd>{record.timedOut ? 'All 100 min' : formatDuration(duration)}</dd>
          </div>
          <div>
            <dt>XP earned</dt>
            <dd>+{record.xp}</dd>
          </div>
        </dl>
      </header>

      <section className={styles.domains} aria-labelledby="by-domain">
        <h2 id="by-domain" className={styles.h2}>
          By exam domain
        </h2>
        <p className={styles.sub}>Case-study questions count towards the domain each one tests.</p>
        <ul className={styles.bars}>
          {EXAM_DOMAINS.map((d) => {
            const { marks, total } = score.byDomain[d];
            const pct = total ? marks / total : 0;
            return (
              <li key={d} className={styles.barRow}>
                <span className={styles.barLabel}>{UNIT_INFO[d].title}</span>
                <span className={styles.barValue}>
                  {Math.round(pct * 100)}%
                  <span className={styles.barMarks}>
                    {round1(marks)} of {total}
                  </span>
                </span>
                <span
                  className={styles.track}
                  role="img"
                  aria-label={`${UNIT_INFO[d].title}: ${Math.round(pct * 100)}%, ${round1(marks)} of ${total} marks`}
                  title={`${round1(marks)} of ${total} marks`}
                >
                  <span className={styles.fill} style={{ width: `${pct * 100}%` }} />
                  <span className={styles.passLine} style={{ left: `${PASS_MARK / 10}%` }} />
                </span>
              </li>
            );
          })}
        </ul>
        <p className={styles.key}>
          <span className={styles.keyLine} aria-hidden="true" /> 70%, the pass line
        </p>
      </section>

      <section aria-labelledby="answers">
        <h2 id="answers" className={styles.h2}>
          Every question
        </h2>
        <div className={styles.filters} role="group" aria-label="Show">
          {(
            [
              ['all', `All (${results.length})`],
              ['missed', `Not fully correct (${missed.length})`],
              ['marked', `Marked (${marked.length})`],
            ] as const
          ).map(([f, label]) => (
            <button
              key={f}
              type="button"
              className={styles.filter}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {label}
            </button>
          ))}
        </div>
        {shown.length ? (
          <ol className={styles.list}>
            {shown.map((r) => (
              <ReviewItem
                key={r.questionId}
                record={record}
                result={r}
                number={results.indexOf(r) + 1}
              />
            ))}
          </ol>
        ) : (
          <p className={styles.sub}>
            {filter === 'missed' ? 'Every question fully correct.' : 'Nothing marked.'}
          </p>
        )}
      </section>

      <div className={styles.actions}>
        {missed.length > 0 && (
          <Link to="/practice/run?mode=mistakes" className={buttons.primary}>
            Practise what you missed
          </Link>
        )}
        <Link to="/mock" className={buttons.secondary}>
          Back to Mock exam
        </Link>
      </div>
    </div>
  );
}

const round1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString();

/** A 0–1,000 scale with the pass mark drawn in and your score marked on it. */
function ScoreScale({ value }: { value: number }) {
  return (
    <div className={styles.scale} aria-hidden="true">
      <span className={styles.scaleFill} style={{ width: `${value / 10}%` }} />
      <span className={styles.scalePass} style={{ left: `${PASS_MARK / 10}%` }}>
        <span>{PASS_MARK}</span>
      </span>
    </div>
  );
}

function ReviewItem({
  record,
  result,
  number,
}: {
  record: MockRecord;
  result: QuestionResult;
  number: number;
}) {
  const bank = useBank();
  const uid = useId().replace(/:/g, '');
  const q = bank.questionById.get(result.questionId)!;
  const answer = record.answers[q.id]?.type === q.type ? record.answers[q.id]! : emptyAnswer(q);
  const caseStudy = q.caseId ? bank.caseById.get(q.caseId) : undefined;
  const isMarked = record.marked.includes(q.id);
  const firstLine = q.stem.split('\n')[0]!.replace(/`/g, '');

  return (
    <li
      className={styles.item}
      data-verdict={fullyCorrect(result) ? 'correct' : result.score.earned ? 'partial' : 'wrong'}
    >
      <details>
        <summary className={styles.summary}>
          <span className={styles.num}>{number}</span>
          <span className={styles.summaryText}>
            <span className={styles.itemVerdict}>
              <VerdictIcon score={result.score} />
              {verdictText(result.score)}
              {isMarked && (
                <span className={styles.markedTag}>
                  <FlagIcon /> Marked
                </span>
              )}
            </span>
            <span className={styles.stemLine}>{firstLine}</span>
          </span>
        </summary>
        <div className={styles.itemBody} data-contained>
          {caseStudy && <p className={styles.caseNote}>From the {caseStudy.title} case study.</p>}
          <QuestionBody
            question={q}
            answer={answer}
            layout={layoutFor(q, record.seeds[q.id] ?? 0)}
            revealed
            uid={uid}
            onChange={() => {}}
          />
          <Feedback question={q} score={result.score} />
          <QuestionTools questionId={q.id} />
        </div>
      </details>
    </li>
  );
}
