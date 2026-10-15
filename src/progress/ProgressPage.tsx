/**
 * Progress dashboard (BUILD_PROMPT 4.6): a readiness estimate, how much of the bank you've
 * covered, mastery by exam domain, your weakest subtopics, and mock scores over time.
 * Every number says how it's worked out.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useBank } from '@/bank/useBank';
import { UNIT_INFO } from '@/learn/course';
import { EXAM_DOMAINS, PASS_MARK } from '@/mock/build';
import { CheckIcon, CrossIcon, HalfIcon } from '@/ui/icons';
import buttons from '@/ui/buttons.module.css';
import {
  analyse,
  FULL_COVERAGE,
  HALF_LIFE_DAYS,
  MIN_SUBTOPIC_ATTEMPTS,
  type Band,
} from './analytics';
import { useAttemptLog, useProgress, useProgressStore } from './hooks';
import { ScoreTrend } from './ScoreTrend';
import { rollDay } from './xp';
import styles from './ProgressPage.module.css';
import { useDocumentTitle } from '@/app/title';

const BAND_TEXT: Record<Band, string> = {
  'on-track': 'On track to pass',
  close: 'Getting close',
  'not-ready': 'Not ready yet',
};

const pct = (n: number) => `${Math.round(n * 100)}%`;

export function ProgressPage() {
  useDocumentTitle('Progress');
  const bank = useBank();
  const doc = useProgress();
  const store = useProgressStore();
  const log = useAttemptLog();
  // Read the clock once per visit: weights don't need to tick while you look.
  const [now] = useState(() => Date.now());
  const a = useMemo(() => (log ? analyse(bank, log, doc, now) : null), [bank, log, doc, now]);

  if (!a) return <p className="loading">Adding up your answers…</p>;

  const streak = rollDay(doc.xp, store.today()).streak.count;
  const trend = [...doc.mocks]
    .sort((x, y) => x.submittedAt.localeCompare(y.submittedAt))
    .map((m) => ({ id: m.id, at: m.submittedAt, score: m.score.scaled, passed: m.score.passed }));
  const started = a.seen > 0 || doc.mocks.length > 0;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Progress</h1>

      <section className={styles.ready} data-band={a.band ?? undefined} aria-labelledby="readiness">
        <h2 id="readiness" className={styles.readyLabel}>
          Readiness estimate
        </h2>
        {a.readiness === null ? (
          <>
            <p className={styles.readyNone}>Not enough to go on yet.</p>
            <p className={styles.note}>
              Do a few lessons or a mock exam and an estimate appears here.
            </p>
          </>
        ) : (
          <>
            <p className={styles.readyLine}>
              <span className={styles.readyScore}>{a.readiness}</span>
              <span className={styles.outOf}>out of 1,000</span>
            </p>
            <p className={styles.band}>
              {a.band === 'on-track' ? (
                <CheckIcon />
              ) : a.band === 'close' ? (
                <HalfIcon />
              ) : (
                <CrossIcon />
              )}
              {BAND_TEXT[a.band!]}
            </p>
            <ul className={styles.sources}>
              <li>
                From mocks:{' '}
                {a.mockScore === null ? (
                  'none yet'
                ) : (
                  <>
                    <strong>{a.mockScore}</strong>, your last{' '}
                    {a.mocksUsed === 1 ? 'mock' : `${a.mocksUsed} mocks`}
                    {a.mocksUsed > 1 ? ', the latest counting most' : ''}
                  </>
                )}
              </li>
              <li>
                From practice:{' '}
                {a.practiceScore === null ? (
                  'none yet'
                ) : (
                  <>
                    <strong>{a.practiceScore}</strong>, recent accuracy × how much of each domain
                    you’ve covered
                  </>
                )}
              </li>
            </ul>
            <p className={styles.note}>
              An estimate, not a prediction:{' '}
              {a.mockScore !== null && a.practiceScore !== null ? '60% mocks, 40% practice. ' : ''}
              The pass mark is {PASS_MARK}.{' '}
              {a.mocksUsed < 3 ? 'Take more mocks for a firmer number.' : ''}
            </p>
          </>
        )}
      </section>

      <section className={styles.tiles} aria-label="Totals">
        <div className={styles.tile}>
          <p className={styles.tileValue}>
            {a.seen}
            <span> of {a.total}</span>
          </p>
          <p className={styles.tileLabel}>questions answered at least once</p>
          <span className={styles.meter} aria-hidden="true">
            <span data-fill style={{ width: pct(a.seen / a.total) }} />
          </span>
        </div>
        <div className={styles.tile}>
          <p className={styles.tileValue}>{doc.mocks.length}</p>
          <p className={styles.tileLabel}>
            {doc.mocks.length === 1 ? 'mock exam taken' : 'mock exams taken'}
          </p>
        </div>
        <div className={styles.tile}>
          <p className={styles.tileValue}>{streak}</p>
          <p className={styles.tileLabel}>day streak</p>
        </div>
      </section>

      <section className={styles.card} aria-labelledby="mastery">
        <h2 id="mastery" className={styles.h2}>
          Mastery by exam domain
        </h2>
        <p className={styles.note}>
          Recent accuracy: an answer’s weight halves every {HALF_LIFE_DAYS} days, so today counts
          most. Case-study questions count towards the domain they test.
        </p>
        <ul className={styles.bars}>
          {EXAM_DOMAINS.map((d) => {
            const t = a.domains[d];
            const label = UNIT_INFO[d].title;
            return (
              <li key={d} className={styles.barRow}>
                <span className={styles.barLabel}>{label}</span>
                <span className={styles.barValue}>
                  {t.mastery === null ? 'Not started' : pct(t.mastery)}
                </span>
                <span
                  className={styles.track}
                  role="img"
                  aria-label={
                    t.mastery === null
                      ? `${label}: not started`
                      : `${label}: ${pct(t.mastery)} recent accuracy, ${t.seen} of ${t.total} questions seen`
                  }
                >
                  <span
                    className={styles.fill}
                    data-fill
                    style={{ width: t.mastery === null ? 0 : pct(t.mastery) }}
                  />
                  <span className={styles.passLine} style={{ left: `${PASS_MARK / 10}%` }} />
                </span>
                <span className={styles.barMeta}>
                  {t.seen} of {t.total} questions seen
                  {t.attempts ? `, ${t.attempts} ${t.attempts === 1 ? 'answer' : 'answers'}` : ''}
                </span>
              </li>
            );
          })}
        </ul>
        <p className={styles.key}>
          <span className={styles.keyLine} aria-hidden="true" /> 70%, the pass line
        </p>
      </section>

      <section className={styles.card} aria-labelledby="weakest">
        <h2 id="weakest" className={styles.h2}>
          Weakest subtopics
        </h2>
        {a.weakest.length ? (
          <>
            <p className={styles.note}>
              Lowest recent accuracy, among subtopics with at least {MIN_SUBTOPIC_ATTEMPTS} answers.
            </p>
            <ol className={styles.weak}>
              {a.weakest.slice(0, 5).map((s) => (
                <li key={`${s.topic}/${s.subtopic}`} className={styles.weakRow}>
                  <span className={styles.weakPct}>{pct(s.mastery!)}</span>
                  <span className={styles.weakText}>
                    <strong>{s.subtopic}</strong>
                    <span>
                      {UNIT_INFO[s.domain].title}, {s.attempts} answers
                    </span>
                  </span>
                  <Link
                    className={styles.weakLink}
                    to={`/practice/run?mode=custom&topic=${encodeURIComponent(s.topic)}&subtopic=${encodeURIComponent(s.subtopic)}&n=10`}
                    aria-label={`Practise ${s.subtopic}`}
                  >
                    Practise
                  </Link>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className={styles.note}>
            Answer at least {MIN_SUBTOPIC_ATTEMPTS} questions in a subtopic and the ones that need
            work show up here.
          </p>
        )}
      </section>

      <section className={styles.card} aria-labelledby="trend">
        <h2 id="trend" className={styles.h2}>
          Mock scores
        </h2>
        {trend.length ? (
          <ScoreTrend points={trend} />
        ) : (
          <p className={styles.note}>Your mock exam scores will chart here.</p>
        )}
      </section>

      {!started && (
        <div className={styles.actions}>
          <Link to="/" className={buttons.primary}>
            Start your first lesson
          </Link>
        </div>
      )}
      <p className={styles.fine}>
        Coverage counts in full once you’ve seen {pct(FULL_COVERAGE)} of a domain’s questions.
        Everything here is worked out on this device from your own answers.
      </p>
    </div>
  );
}
