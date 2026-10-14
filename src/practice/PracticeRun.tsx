/**
 * A practice run in focus mode. ?mode= picks the questions:
 * - review: spaced-repetition cards due today (up to REVIEW_CAP)
 * - mistakes: questions whose last answer wasn't fully right (up to REVIEW_CAP)
 * - custom: the URL filter, ranked mistakes → unseen → the rest, ?n= long (0 = all)
 * The selection is fixed when the run starts, so answering doesn't reshuffle it.
 */
import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useBank } from '@/bank/useBank';
import { useProgress, useProgressStore } from '@/progress/hooks';
import { localDay } from '@/progress/xp';
import { FinishCard } from '@/quiz/FinishCard';
import { QuizRun } from '@/quiz/QuizRun';
import { firstTryAccuracy, PRACTICE_OPTIONS, type Session } from '@/quiz/session';
import buttons from '@/ui/buttons.module.css';
import { parseFilter, parseLength } from './query';
import { dueIds, filterQuestions, mistakeIds, rankForPractice } from './select';
import styles from './PracticeRun.module.css';

/** Longest review or mistakes run; the rest wait for the next one. */
const REVIEW_CAP = 20;
type Mode = 'review' | 'mistakes' | 'custom';

const TITLES: Record<Mode, string> = {
  review: 'Review',
  mistakes: 'Fix mistakes',
  custom: 'Practice',
};

export function PracticeRun() {
  const [params] = useSearchParams();
  const raw = params.get('mode');
  const mode: Mode = raw === 'review' || raw === 'mistakes' ? raw : 'custom';
  const [run, setRun] = useState(0);
  return (
    <Run
      key={`${params.toString()}:${run}`}
      mode={mode}
      params={params}
      onAgain={() => setRun((r) => r + 1)}
    />
  );
}

function Run({
  mode,
  params,
  onAgain,
}: {
  mode: Mode;
  params: URLSearchParams;
  onAgain: () => void;
}) {
  const bank = useBank();
  const store = useProgressStore();
  const doc = useProgress();

  // Chosen once per run, from the progress as it stood when the run started.
  const [ids] = useState(() => {
    const snapshot = store.getSnapshot();
    if (mode === 'review') return dueIds(bank, snapshot, localDay()).slice(0, REVIEW_CAP);
    if (mode === 'mistakes') return mistakeIds(bank, snapshot).slice(0, REVIEW_CAP);
    const pool = filterQuestions(bank.questions, parseFilter(params)).map((q) => q.id);
    const n = parseLength(params);
    return rankForPractice(pool, snapshot, n === 0 ? pool.length : n);
  });

  const onFinish = useCallback((s: Session) => store.bankXp(s.xp), [store]);

  if (!ids.length) {
    return (
      <main id="main" className={styles.empty}>
        <h1>
          {mode === 'review'
            ? 'Nothing due'
            : mode === 'mistakes'
              ? 'No mistakes to fix'
              : 'No questions match'}
        </h1>
        <p>
          {mode === 'custom'
            ? 'Loosen the filter on the Practice page and try again.'
            : 'Nice. Come back after your next lesson or practice.'}
        </p>
        <Link to="/practice" className={buttons.primary}>
          Back to Practice
        </Link>
      </main>
    );
  }

  const renderFinish = (s: Session) => {
    const accuracy = firstTryAccuracy(s);
    const stillToFix = mistakeIds(bank, doc).length;
    return (
      <FinishCard
        context={TITLES[mode]}
        tone={accuracy === 1 ? 'good' : 'neutral'}
        title={accuracy === 1 ? 'All right first time' : 'Run complete'}
        text={
          mode === 'review'
            ? 'Right answers moved up a box and come back later; misses come back tomorrow.'
            : `You answered all ${s.total} questions. ${s.missed.length ? `${s.missed.length} took a second go.` : ''}`
        }
        stats={[
          { label: 'First-try score', value: `${Math.round(accuracy * 100)}%` },
          { label: 'XP earned', value: `+${s.xp}` },
          { label: 'Still to fix', value: String(stillToFix) },
        ]}
        actions={
          <>
            <button type="button" className={buttons.primary} onClick={onAgain}>
              {mode === 'custom' ? 'Practise again' : 'Go again'}
            </button>
            <Link to="/practice" className={buttons.secondary}>
              Back to Practice
            </Link>
          </>
        }
      />
    );
  };

  return (
    <QuizRun
      questionIds={ids}
      options={PRACTICE_OPTIONS}
      mode={mode === 'custom' ? 'practice' : mode}
      noun={mode === 'custom' ? 'practice' : mode === 'review' ? 'review' : 'run'}
      title={TITLES[mode]}
      exitTo="/practice"
      onFinish={onFinish}
      renderFinish={renderFinish}
    />
  );
}
