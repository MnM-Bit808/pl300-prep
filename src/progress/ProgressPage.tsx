/**
 * Progress dashboard (BUILD_PROMPT 4.6): a readiness estimate, how much of the bank you've
 * covered, mastery by exam domain, your weakest subtopics, and mock scores over time.
 * Every number says how it's worked out.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useBank } from '@/bank/useBank';
import { UNIT_INFO } from '@/learn/course';
import { unitDone } from '@/learn/rules';
import { useCourse } from '@/learn/useCourse';
import { formatDate } from '@/lib/dates';
import { DomainIcon } from '@/ui/domains';
import { EXAM_DOMAINS, PASS_MARK } from '@/mock/build';
import { CheckIcon, CrossIcon, HalfIcon, RibbonIcon } from '@/ui/icons';
import buttons from '@/ui/buttons.module.css';
import {
  analyse,
  FULL_COVERAGE,
  HALF_LIFE_DAYS,
  MIN_SUBTOPIC_ATTEMPTS,
  type Band,
} from './analytics';
import { useAttemptLog, useProgress, useProgressStore } from './hooks';
import { MILESTONES, reached } from './milestones';
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

  const { course } = useCourse();

  // Milestones that need the course and the analytics are checked here, then kept for good.
  useEffect(() => {
    if (!a) return;
    store.earnMilestones(
      reached({
        lessonsDone: Object.keys(doc.lessons).length,
        streak: rollDay(doc.xp, store.today()).streak.count,
        mockScores: doc.mocks.map((m) => m.score.scaled),
        unitsComplete: course.units
          .filter((u) => unitDone(u, doc) === u.lessons.length)
          .map((u) => u.domain),
        mastery: a.domains,
      }),
    );
  }, [a, doc, course, store]);

  if (!a) return <p className="loading">Adding up your answers…</p>;

  const streak = rollDay(doc.xp, store.today()).streak.count;
  const trend = [...doc.mocks]
    .sort((x, y) => x.submittedAt.localeCompare(y.submittedAt))
    .map((m) => ({ id: m.id, at: m.submittedAt, score: m.score.scaled, passed: m.score.passed }));
  const started = a.seen > 0 || doc.mocks.length > 0;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Progress</h1>

      {started ? (
        <>
          <section
            className={styles.ready}
            data-band={a.band ?? undefined}
            aria-labelledby="readiness"
          >
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
                {/* The exam's own scale, with the pass mark where it sits on it. */}
                <div
                  className={styles.scale}
                  role="img"
                  aria-label={`${a.readiness} on the exam's scale of 0 to 1,000. The pass mark is ${PASS_MARK}.`}
                >
                  <span className={styles.scaleTrack}>
                    <span
                      className={styles.scaleFill}
                      data-fill
                      style={{ width: `${a.readiness / 10}%` }}
                    />
                    <span className={styles.scalePass} style={{ left: `${PASS_MARK / 10}%` }} />
                  </span>
                  <span className={styles.scaleTicks} aria-hidden="true">
                    <span>0</span>
                    <span className={styles.scalePassLabel} style={{ left: `${PASS_MARK / 10}%` }}>
                      Pass {PASS_MARK}
                    </span>
                    <span>1,000</span>
                  </span>
                </div>
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
                        <strong>{a.practiceScore}</strong>, recent accuracy × how much of each
                        domain you’ve covered
                      </>
                    )}
                  </li>
                </ul>
                <p className={styles.note}>
                  An estimate, not a prediction:{' '}
                  {a.mockScore !== null && a.practiceScore !== null
                    ? '60% mocks, 40% practice. '
                    : ''}
                  The pass mark is {PASS_MARK}.{' '}
                  {a.mocksUsed < 3 ? 'Take more mocks for a firmer number.' : ''}
                </p>
              </>
            )}
          </section>

          {/* Plain facts in a line: totals don't need a box each. */}
          <ul className={styles.facts} aria-label="Totals">
            <li>
              <strong>{a.seen}</strong> of {a.total} <span>questions answered at least once</span>
            </li>
            <li>
              <strong>{doc.mocks.length}</strong>{' '}
              {doc.mocks.length === 1 ? 'mock exam taken' : 'mock exams taken'}
            </li>
            <li>
              <strong>{streak}</strong>-day streak
            </li>
          </ul>
        </>
      ) : (
        // A first visit gets an explanation and two ways in, not a page of zeros.
        <section className={styles.ready} aria-labelledby="progress-intro">
          <h2 id="progress-intro" className={styles.introTitle}>
            Your progress builds up here
          </h2>
          <p className={styles.note}>
            Answer questions in a lesson, practice or a mock exam and this page fills in: an
            estimated exam score out of 1,000, how well you know each domain, your weakest topics
            and your mock scores over time.
          </p>
          <div className={styles.introActions}>
            <Link to="/" className={buttons.primary}>
              Start your first lesson
            </Link>
            <Link to="/mock" className={buttons.secondary}>
              Try a mock exam
            </Link>
          </div>
        </section>
      )}

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
              <li key={d} className={styles.barRow} data-domain={d}>
                <span className={styles.barLabel}>
                  <DomainIcon domain={d} />
                  {label}
                </span>
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

      <section className={styles.card} aria-labelledby="milestones">
        <h2 id="milestones" className={styles.h2}>
          Milestones
        </h2>
        <p className={styles.note}>
          {Object.keys(doc.milestones).length} of {MILESTONES.length} earned. Once earned, a
          milestone stays.
        </p>
        <ul className={styles.badges}>
          {/* Earned first, then what's still to aim for, each in the list's own order. */}
          {[...MILESTONES]
            .sort((x, y) => Number(!doc.milestones[x.id]) - Number(!doc.milestones[y.id]))
            .map((m) => {
              const on = doc.milestones[m.id];
              return (
                <li
                  key={m.id}
                  className={styles.badge}
                  data-earned={on ? '' : undefined}
                  data-domain={m.domain}
                >
                  <span className={styles.badgeIcon}>
                    {m.domain ? (
                      <DomainIcon domain={m.domain} />
                    ) : (
                      <RibbonIcon aria-hidden="true" />
                    )}
                  </span>
                  <span className={styles.badgeText}>
                    <span className={styles.badgeTitle}>{m.title}</span>
                    <span className={styles.badgeDetail}>
                      {on ? `Earned ${formatDate(`${on}T12:00:00`)}` : m.detail}
                    </span>
                  </span>
                </li>
              );
            })}
        </ul>
      </section>

      {started && (
        <>
          <section className={styles.card} aria-labelledby="weakest">
            <h2 id="weakest" className={styles.h2}>
              Weakest subtopics
            </h2>
            {a.weakest.length ? (
              <>
                <p className={styles.note}>
                  Lowest recent accuracy, among subtopics with at least {MIN_SUBTOPIC_ATTEMPTS}{' '}
                  answers.
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
                Answer at least {MIN_SUBTOPIC_ATTEMPTS} questions in a subtopic and the ones that
                need work show up here.
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
        </>
      )}
      <p className={styles.fine}>
        Coverage counts in full once you’ve seen {pct(FULL_COVERAGE)} of a domain’s questions.
        Everything here is worked out on this device from your own answers.
      </p>
    </div>
  );
}
