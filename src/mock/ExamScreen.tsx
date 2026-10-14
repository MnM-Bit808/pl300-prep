/**
 * The mock exam in progress (focus mode). State is the pure exam reducer, saved after every
 * change so a reload resumes exactly where you were, with the clock still running.
 *
 * Exam rules: no feedback while answering; move freely within a section; mark questions for
 * review; a review screen ends each section; finishing section 1 locks it before the case
 * study; the clock reaching zero submits everything.
 */
import { useEffect, useId, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { Bank } from '@/bank/load';
import { useBank } from '@/bank/useBank';
import { useStickyOffset } from '@/lib/useStickyOffset';
import { CaseFrame } from '@/case/CaseFrame';
import { useProgressStore } from '@/progress/hooks';
import { layoutFor, type Answer } from '@/questions/answer';
import { progressText } from '@/questions/labels';
import { QuestionBody } from '@/questions/QuestionBody';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ClockIcon,
  CloseIcon,
  FlagIcon,
  GridIcon,
} from '@/ui/icons';
import buttons from '@/ui/buttons.module.css';
import {
  currentId,
  currentIds,
  examReducer,
  isLastSection,
  tileState,
  type ExamState,
} from './exam';
import { GridLegend, QuestionGrid } from './QuestionGrid';
import { toRecord } from './record';
import { formatClock, useCountdown } from './useCountdown';
import styles from './ExamScreen.module.css';
import { useDocumentTitle } from '@/app/title';

/** Minutes left at which the time is announced to screen readers. */
const ANNOUNCE_AT = [30, 10, 5, 1];

export function ExamScreen() {
  useDocumentTitle('Mock exam');
  const store = useProgressStore();
  const [draft] = useState(() => store.getMockDraft());
  if (!draft || draft.submitted) {
    return (
      <main id="main" className={styles.none}>
        <h1>No mock exam in progress</h1>
        <p>Start one from the Mock exam page.</p>
        <Link to="/mock" className={buttons.primary}>
          Go to Mock exam
        </Link>
      </main>
    );
  }
  return <Exam initial={draft} />;
}

type Confirm = null | 'finish' | 'end';

function Exam({ initial }: { initial: ExamState }) {
  const bank = useBank();
  const store = useProgressStore();
  const navigate = useNavigate();
  const [s, dispatch] = useReducer(examReducer, initial);
  const [mapOpen, setMapOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [announce, setAnnounce] = useState('');
  const left = useCountdown(s.endsAt);
  const uid = useId().replace(/:/g, '');
  const questionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  useStickyOffset(headerRef, screenRef);

  // Save every change; on submission, score, file and show the results (exactly once).
  const filed = useRef(false);
  useEffect(() => {
    if (!s.submitted) {
      store.saveMockDraft(s);
      return;
    }
    if (filed.current) return;
    filed.current = true;
    const { record, attempts } = toRecord(bank, s);
    store.submitMock(record, attempts);
    navigate(`/mock/results/${record.id}`, { replace: true, state: { timedOut: record.timedOut } });
  }, [s, store, bank, navigate]);

  // Time up submits from wherever you are, including straight after a late resume.
  useEffect(() => {
    if (left <= 0 && !s.submitted) dispatch({ type: 'timeUp', at: new Date().toISOString() });
  }, [left, s.submitted]);

  // Announce the time at a few thresholds, once each, only as they are crossed.
  const announced = useRef(new Set(ANNOUNCE_AT.filter((m) => left <= m * 60_000)));
  useEffect(() => {
    for (const m of ANNOUNCE_AT) {
      if (left <= m * 60_000 && !announced.current.has(m)) {
        announced.current.add(m);
        setAnnounce(`${m === 1 ? '1 minute' : `${m} minutes`} left.`);
      }
    }
  }, [left]);

  // A new question: back to the top, focus on the question for screen readers.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0 });
    questionRef.current?.focus({ preventScroll: true });
  }, [s.section, s.index, s.view]);

  const ids = currentIds(s);
  const id = currentId(s);
  const question = id ? bank.questionById.get(id) : undefined;
  const answer = id ? s.answers[id] : undefined;
  const section = s.sections[s.section];
  const caseStudy = section?.caseId ? bank.caseById.get(section.caseId) : undefined;
  const urgency = left <= 5 * 60_000 ? 'urgent' : left <= 10 * 60_000 ? 'soon' : 'calm';
  const marked = Boolean(id && s.marked.includes(id));
  const last = isLastSection(s);

  const counts = summary(bank, s, ids);

  const header = (
    <header ref={headerRef} className={styles.top}>
      <div className={styles.topInner}>
        <p className={styles.where}>
          <span className={styles.section}>
            Section {s.section + 1} of {s.sections.length}
            {section?.kind === 'case' && caseStudy ? `: ${caseStudy.title}` : ''}
          </span>
          {s.view === 'question' && (
            <span>
              Question {s.index + 1} of {ids.length}
            </span>
          )}
        </p>
        <p
          className={styles.timer}
          data-urgency={urgency}
          role="timer"
          aria-label={`Time left ${formatClock(left)}`}
        >
          <ClockIcon aria-hidden="true" />
          <span aria-hidden="true">{formatClock(left)}</span>
        </p>
        <div className={styles.topActions}>
          <button type="button" className={styles.topBtn} onClick={() => setMapOpen(true)}>
            <GridIcon /> <span className={styles.collapsible}>Questions</span>
          </button>
          <button type="button" className={styles.topBtn} onClick={() => setConfirm('end')}>
            <CloseIcon /> <span className={styles.collapsible}>End exam</span>
          </button>
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
    </header>
  );

  let body;
  if (s.view === 'review') {
    body = (
      <section
        ref={questionRef}
        tabIndex={-1}
        className={styles.review}
        aria-labelledby={`${uid}-review`}
      >
        <h1 id={`${uid}-review`} className={styles.reviewTitle}>
          Review section {s.section + 1}
        </h1>
        <p className={styles.reviewText}>
          {counts.answered} of {ids.length} answered
          {counts.partial ? `, ${counts.partial} part answered` : ''}
          {counts.marked ? `, ${counts.marked} marked for review` : ''}. Pick a question to go back
          to it.
        </p>
        <GridLegend />
        <QuestionGrid
          bank={bank}
          state={s}
          ids={ids}
          onPick={(i) => dispatch({ type: 'backToQuestions', index: i })}
        />
        <div className={styles.reviewActions}>
          <button
            type="button"
            className={buttons.secondary}
            onClick={() => dispatch({ type: 'backToQuestions' })}
          >
            Back to the questions
          </button>
          <button type="button" className={buttons.primary} onClick={() => setConfirm('finish')}>
            {last ? 'Submit exam' : `Finish section ${s.section + 1}`}
          </button>
        </div>
      </section>
    );
  } else if (question && answer && id) {
    const layout = layoutFor(question, s.seeds[id] ?? 0);
    const q = (
      <article
        ref={questionRef}
        tabIndex={-1}
        className={styles.question}
        aria-labelledby={`${uid}-${id}-stem`}
      >
        <QuestionBody
          key={id}
          question={question}
          answer={answer}
          layout={layout}
          revealed={false}
          uid={`${uid}-${id}`}
          meta="format"
          onChange={(update) =>
            dispatch({
              type: 'update',
              questionId: id,
              update: update as unknown as (prev: Answer) => Answer,
            })
          }
        />
      </article>
    );
    body = caseStudy ? (
      <CaseFrame key={caseStudy.id} caseStudy={caseStudy}>
        {q}
      </CaseFrame>
    ) : (
      q
    );
  }

  return (
    <div ref={screenRef} className={styles.screen}>
      {header}
      <main id="main" className={styles.main} data-case={caseStudy ? '' : undefined}>
        {/* The review view has its own visible heading. */}
        {s.view !== 'review' && (
          <h1 className="sr-only">
            Mock exam, section {s.section + 1} of {s.sections.length}
          </h1>
        )}
        {body}
      </main>

      {s.view === 'question' && question && answer && id && (
        <footer className={styles.bar}>
          <div className={styles.barInner}>
            <button
              type="button"
              className={styles.navBtn}
              onClick={() => dispatch({ type: 'prev' })}
              disabled={s.index === 0}
              aria-label="Previous question"
            >
              <ArrowLeftIcon />
            </button>
            <button
              type="button"
              className={styles.mark}
              aria-pressed={marked}
              onClick={() => dispatch({ type: 'toggleMark', questionId: id })}
            >
              <FlagIcon />
              {marked ? 'Marked' : 'Mark for review'}
            </button>
            <p className={styles.progress}>{progressText(question, answer)}</p>
            <button
              type="button"
              className={styles.next}
              onClick={() => dispatch({ type: 'next' })}
            >
              {s.index === ids.length - 1 ? 'Review section' : 'Next'}
              <ArrowRightIcon />
            </button>
          </div>
        </footer>
      )}

      {mapOpen && (
        <MapDialog
          bank={bank}
          state={s}
          ids={ids}
          onPick={(i) => {
            dispatch({ type: 'goto', index: i });
            setMapOpen(false);
          }}
          onReview={() => {
            dispatch({ type: 'review' });
            setMapOpen(false);
          }}
          onClose={() => setMapOpen(false)}
        />
      )}

      {confirm === 'finish' && (
        <ConfirmDialog
          title={last ? 'Submit the exam?' : `Finish section ${s.section + 1}?`}
          body={
            (counts.empty + counts.partial
              ? `${counts.empty + counts.partial} ${counts.empty + counts.partial === 1 ? 'question isn’t' : 'questions aren’t'} fully answered and will lose marks. `
              : '') +
            (last
              ? 'You’ll see your score and every answer straight away.'
              : 'You can’t come back to this section once the case study starts.')
          }
          cancelLabel="Keep reviewing"
          confirmLabel={last ? 'Submit' : 'Finish section'}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            setConfirm(null);
            dispatch({ type: 'finishSection', at: new Date().toISOString() });
          }}
        />
      )}

      {confirm === 'end' && (
        <ConfirmDialog
          title="End the exam now?"
          body="Your answers so far are scored and unanswered questions get no marks, including any section you haven’t reached."
          cancelLabel="Keep going"
          confirmLabel="End and score"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            setConfirm(null);
            dispatch({ type: 'timeUp', at: new Date().toISOString() });
          }}
        />
      )}
    </div>
  );
}

function summary(bank: Bank, s: ExamState, ids: readonly string[]) {
  const states = ids.map((id) => tileState(bank, s, id));
  return {
    answered: states.filter((t) => t === 'answered').length,
    partial: states.filter((t) => t === 'partial').length,
    empty: states.filter((t) => t === 'empty').length,
    marked: ids.filter((id) => s.marked.includes(id)).length,
  };
}

interface MapProps {
  bank: Bank;
  state: ExamState;
  ids: readonly string[];
  onPick: (index: number) => void;
  onReview: () => void;
  onClose: () => void;
}

function MapDialog({ bank, state, ids, onPick, onReview, onClose }: MapProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const d = ref.current;
    if (!d) return;
    d.showModal();
    return () => d.close();
  }, []);
  const locked = state.locked.filter((i) => i < state.section);

  return (
    <dialog
      ref={ref}
      className={styles.map}
      aria-labelledby="map-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={styles.mapHead}>
        <h2 id="map-title">Section {state.section + 1} questions</h2>
        <button
          type="button"
          className={styles.topBtn}
          onClick={onClose}
          aria-label="Close question map"
        >
          <CloseIcon />
        </button>
      </div>
      {locked.length > 0 && (
        <p className={styles.locked}>
          Section {locked.map((i) => i + 1).join(', ')} is finished and locked.
        </p>
      )}
      <GridLegend />
      <QuestionGrid
        bank={bank}
        state={state}
        ids={ids}
        current={state.view === 'question' ? state.index : undefined}
        onPick={onPick}
      />
      <button type="button" className={buttons.secondary} onClick={onReview}>
        Review section {state.section + 1}
      </button>
    </dialog>
  );
}
