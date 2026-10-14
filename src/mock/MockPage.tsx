/** Mock exam hub: what the exam is like, resume or start one, and past results. */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useBank } from '@/bank/useBank';
import { formatDate } from '@/lib/dates';
import { useProgress, useProgressStore } from '@/progress/hooks';
import { hasInput } from '@/questions/answer';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { CheckIcon, CrossIcon } from '@/ui/icons';
import buttons from '@/ui/buttons.module.css';
import { buildMock, MOCK_MINUTES, MOCK_SIZE, PASS_MARK } from './build';
import { startExam } from './exam';
import { formatClock } from './useCountdown';
import styles from './MockPage.module.css';

export function MockPage() {
  const bank = useBank();
  const store = useProgressStore();
  const doc = useProgress();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(() => store.getMockDraft());
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // Read the clock once: this page doesn't tick (the exam screen does).
  const [now] = useState(() => Date.now());
  const live = draft && !draft.submitted && draft.endsAt > now ? draft : null;
  const expired = draft && !draft.submitted && draft.endsAt <= now;

  const start = () => {
    const sections = buildMock(bank, doc.mocks);
    store.saveMockDraft(startExam(bank, sections, new Date()));
    navigate('/mock/exam');
  };

  const history = [...doc.mocks].reverse();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Mock exam</h1>

      <section className={styles.format} aria-labelledby="format">
        <h2 id="format">How it works</h2>
        <ul className={styles.facts}>
          <li>
            <strong>{MOCK_SIZE}</strong> questions
          </li>
          <li>
            <strong>{MOCK_MINUTES}</strong> minutes
          </li>
          <li>
            <strong>{PASS_MARK}</strong> to pass, out of 1,000
          </li>
        </ul>
        <ol className={styles.steps}>
          <li>Section 1 mixes the four exam domains by their exam weights.</li>
          <li>Section 2 is one case study. Once it starts, section 1 is locked.</li>
          <li>No answers are shown until the end. Mark questions to come back to them.</li>
          <li>When the clock reaches zero, the exam is submitted for you.</li>
        </ol>
      </section>

      {live ? (
        <section className={styles.live} aria-labelledby="live">
          <h2 id="live">Exam in progress</h2>
          <p>
            {Object.values(live.answers).filter(hasInput).length} of {MOCK_SIZE} answered,{' '}
            {formatClock(live.endsAt - now)} left. The clock keeps running while you’re away.
          </p>
          <div className={styles.actions}>
            <Link to="/mock/exam" className={buttons.primary}>
              Resume exam
            </Link>
            <button
              type="button"
              className={buttons.secondary}
              onClick={() => setConfirmDiscard(true)}
            >
              Discard it
            </button>
          </div>
        </section>
      ) : (
        <div className={styles.actions}>
          {expired && (
            <p className={styles.note}>
              Your last exam ran out of time while you were away. Open it to see its score.
            </p>
          )}
          {expired ? (
            <Link to="/mock/exam" className={buttons.primary}>
              Score the unfinished exam
            </Link>
          ) : (
            <button type="button" className={buttons.primary} onClick={start}>
              Start a mock exam
            </button>
          )}
        </div>
      )}

      <section aria-labelledby="history">
        <h2 id="history" className={styles.h2}>
          Past results
        </h2>
        {history.length ? (
          <ol className={styles.history}>
            {history.map((m) => (
              <li key={m.id}>
                <Link
                  to={`/mock/results/${m.id}`}
                  className={styles.row}
                  data-pass={m.score.passed || undefined}
                >
                  <span className={styles.score}>{m.score.scaled}</span>
                  <span className={styles.rowText}>
                    <span className={styles.verdict}>
                      {m.score.passed ? <CheckIcon /> : <CrossIcon />}
                      {m.score.passed ? 'Pass' : 'Below the pass mark'}
                    </span>
                    <span className={styles.meta}>
                      {formatDate(m.submittedAt)}
                      {m.timedOut ? ', time ran out' : ''}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.note}>Your scores will appear here after your first mock.</p>
        )}
      </section>

      {confirmDiscard && (
        <ConfirmDialog
          title="Discard this exam?"
          body="It won’t be scored or saved, and your answers in it are lost."
          cancelLabel="Keep it"
          confirmLabel="Discard"
          onCancel={() => setConfirmDiscard(false)}
          onConfirm={() => {
            store.saveMockDraft(null);
            setDraft(null);
            setConfirmDiscard(false);
          }}
        />
      )}
    </div>
  );
}
