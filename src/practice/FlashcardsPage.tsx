/**
 * Flashcards (BUILD_PROMPT 4.4): the question stem on the front, the takeaway and the answer
 * on the back. Study aid only: cards don't touch the spaced-repetition schedule, which is
 * driven by actually answering questions.
 *
 * Interactions: tap the card or press Space to flip; once flipped, swipe right / → for "Got it"
 * (the card leaves the deck) or left / ← for "Again" (it goes to the back of the deck).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { Question } from '@/bank/schema';
import { useBank } from '@/bank/useBank';
import { Exhibit } from '@/exhibits/Exhibit';
import { shuffled } from '@/lib/random';
import { answerLines } from '@/questions/answerText';
import { DIFFICULTY_LABEL } from '@/questions/labels';
import { FinishCard } from '@/quiz/FinishCard';
import buttons from '@/ui/buttons.module.css';
import { CheckIcon, CloseIcon, RetryIcon } from '@/ui/icons';
import { InlineText, RichText } from '@/ui/RichText';
import { parseFilter } from './query';
import { filterQuestions } from './select';
import styles from './FlashcardsPage.module.css';
import { useDocumentTitle } from '@/app/title';

const DECK_SIZE = 20;
const SWIPE_AT = 110;
const LEAVE_MS = 260;

export function FlashcardsPage() {
  useDocumentTitle('Flashcards');
  const [params] = useSearchParams();
  const [round, setRound] = useState(0);
  return (
    <Deck
      key={`${params.toString()}:${round}`}
      params={params}
      onAgain={() => setRound((r) => r + 1)}
    />
  );
}

type Verdict = 'got' | 'again';

function Deck({ params, onAgain }: { params: URLSearchParams; onAgain: () => void }) {
  const bank = useBank();
  // Case questions are left out: their stems only make sense next to the case study.
  const [deck] = useState(() =>
    shuffled(
      filterQuestions(bank.questions, parseFilter(params))
        .filter((q) => !q.caseId)
        .map((q) => q.id),
    ).slice(0, DECK_SIZE),
  );
  const [queue, setQueue] = useState(deck);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<string[]>([]);
  const [againIds, setAgainIds] = useState<string[]>([]);
  const [leaving, setLeaving] = useState<Verdict | null>(null);
  // Bumped on every decision so each showing of a card is a fresh component (no leftover drag).
  const [turn, setTurn] = useState(0);
  const [status, setStatus] = useState('');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const current = queue[0] ? bank.questionById.get(queue[0]) : undefined;

  const decide = useCallback(
    (verdict: Verdict) => {
      if (!flipped || leaving || !queue[0]) return;
      const id = queue[0];
      setLeaving(verdict);
      const left = verdict === 'got' ? queue.length - 1 : queue.length;
      setStatus(
        verdict === 'got' ? `Got it. ${left} left.` : `Again: back of the deck. ${left} left.`,
      );
      // A timer, not transitionend: it fires even if the transition is skipped (reduced motion).
      timer.current = window.setTimeout(() => {
        setQueue((q) => (verdict === 'got' ? q.slice(1) : [...q.slice(1), id]));
        if (verdict === 'got' && !againIds.includes(id)) setKnown((k) => [...k, id]);
        if (verdict === 'again') setAgainIds((a) => (a.includes(id) ? a : [...a, id]));
        setFlipped(false);
        setLeaving(null);
        setTurn((t) => t + 1);
      }, LEAVE_MS);
    },
    [flipped, leaving, queue, againIds],
  );

  const flip = useCallback(() => {
    if (leaving) return;
    setFlipped((f) => !f);
    setStatus(flipped ? 'Question side.' : 'Answer side.');
  }, [leaving, flipped]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || document.querySelector('dialog[open]')) return;
      const onButton =
        e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement;
      if ((e.key === ' ' || e.key === 'Enter') && !onButton) {
        e.preventDefault();
        flip();
      } else if (e.key === 'ArrowRight') decide('got');
      else if (e.key === 'ArrowLeft') decide('again');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [flip, decide]);

  if (!deck.length) {
    return (
      <main id="main" className={styles.empty}>
        <h1>No cards for this selection</h1>
        <p>Case-study questions aren’t made into cards. Pick another domain or topic.</p>
        <Link to="/practice" className={buttons.primary}>
          Back to Practice
        </Link>
      </main>
    );
  }

  if (!current) {
    return (
      <FinishCard
        context="Flashcards"
        tone="good"
        title="Deck done"
        text="Cards you sent back came round again until you knew them."
        stats={[
          { label: 'Cards', value: String(deck.length) },
          { label: 'Knew first time', value: String(known.length) },
          { label: 'Needed another look', value: String(againIds.length) },
        ]}
        actions={
          <>
            <button type="button" className={buttons.primary} onClick={onAgain}>
              Shuffle a new deck
            </button>
            <Link to="/practice" className={buttons.secondary}>
              Back to Practice
            </Link>
          </>
        }
      />
    );
  }

  const done = deck.length - queue.length;
  return (
    <div className={styles.screen}>
      <header className={styles.top}>
        <Link to="/practice" className={styles.close} aria-label="Close flashcards">
          <CloseIcon />
        </Link>
        <div
          className={styles.progress}
          role="progressbar"
          aria-label="Deck progress"
          aria-valuemin={0}
          aria-valuemax={deck.length}
          aria-valuenow={done}
          aria-valuetext={`${done} of ${deck.length} cards done`}
        >
          <span data-fill style={{ width: `${(done / deck.length) * 100}%` }} />
        </div>
        <p className={styles.count}>
          {queue.length}
          <span> left</span>
        </p>
      </header>

      <main id="main" className={styles.main}>
        <h1 className="sr-only">Flashcards</h1>
        <Card
          key={`${current.id}:${turn}`}
          question={current}
          flipped={flipped}
          leaving={leaving}
          hasNext={queue.length > 1}
          onFlip={flip}
          onDecide={decide}
        />

        <div className={styles.controls}>
          {flipped ? (
            <>
              <button type="button" className={styles.again} onClick={() => decide('again')}>
                <RetryIcon /> Again
              </button>
              <button type="button" className={styles.got} onClick={() => decide('got')}>
                <CheckIcon /> Got it
              </button>
            </>
          ) : (
            <button type="button" className={buttons.primary} onClick={flip}>
              Show answer
            </button>
          )}
        </div>
        <p className={styles.hint}>
          {flipped
            ? 'Swipe right if you knew it, left to see it again.'
            : 'Tap the card or press Space to turn it over.'}
        </p>
        <p className="sr-only" role="status" aria-live="polite">
          {status}
        </p>
      </main>
    </div>
  );
}

interface CardProps {
  question: Question;
  flipped: boolean;
  leaving: Verdict | null;
  hasNext: boolean;
  onFlip: () => void;
  onDecide: (v: Verdict) => void;
}

function Card({ question, flipped, leaving, hasNext, onFlip, onDecide }: CardProps) {
  const [dx, setDx] = useState(0);
  const drag = useRef<{ x: number; id: number; moved: boolean } | null>(null);
  const lines = useMemo(() => answerLines(question), [question]);

  const onPointerDown = (e: PointerEvent) => {
    // Let buttons inside the card (Enlarge) do their own thing.
    if ((e.target as HTMLElement).closest('button, a')) return;
    drag.current = { x: e.clientX, id: e.pointerId, moved: false };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* capture is optional */
    }
  };
  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const delta = e.clientX - d.x;
    if (Math.abs(delta) > 6) d.moved = true;
    // Only a flipped card can be swiped away; an unflipped one just resists a little.
    setDx(flipped ? delta : delta * 0.15);
  };
  const onPointerUp = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.moved) {
      setDx(0);
      onFlip();
      return;
    }
    if (flipped && Math.abs(dx) >= SWIPE_AT) onDecide(dx > 0 ? 'got' : 'again');
    else setDx(0);
  };

  const offset = leaving ? (leaving === 'got' ? 1 : -1) * 1.2 * window.innerWidth : dx;
  const cue = leaving ?? (dx > 30 ? 'got' : dx < -30 ? 'again' : null);
  const cueStrength = leaving ? 1 : Math.min(1, Math.abs(dx) / SWIPE_AT);

  return (
    <div className={styles.deck}>
      {hasNext && <div className={styles.under} aria-hidden="true" />}
      <div
        className={styles.card}
        data-dragging={dx !== 0 && !leaving ? '' : undefined}
        data-leaving={leaving ?? undefined}
        style={{ transform: `translateX(${offset}px) rotate(${offset / 28}deg)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null;
          setDx(0);
        }}
      >
        <div className={styles.flipper} data-flipped={flipped || undefined}>
          <section
            className={styles.face}
            inert={flipped}
            aria-hidden={flipped}
            aria-label="Question"
          >
            <p className={styles.meta}>
              {question.subtopic}
              <span>{DIFFICULTY_LABEL[question.difficulty]}</span>
            </p>
            <RichText text={question.stem} className={styles.stem} />
            {question.image && <Exhibit image={question.image} label={question.id} />}
          </section>
          <section
            className={`${styles.face} ${styles.back}`}
            inert={!flipped}
            aria-hidden={!flipped}
            aria-label="Answer"
          >
            <p className={styles.backLabel}>Rule to remember</p>
            <div className={styles.rule}>
              <span className={styles.fx} aria-hidden="true">
                fx
              </span>
              <p>
                <InlineText text={question.takeaway} />
              </p>
            </div>
            <p className={styles.backLabel}>{lines.length > 1 ? 'Answers' : 'Answer'}</p>
            <ul className={styles.answers}>
              {lines.map((l, i) => (
                <li key={i}>
                  <InlineText text={l} />
                </li>
              ))}
            </ul>
          </section>
        </div>
        {cue && (
          <span
            className={styles.cue}
            data-cue={cue}
            style={{ opacity: cueStrength }}
            aria-hidden="true"
          >
            {cue === 'got' ? 'Got it' : 'Again'}
          </span>
        )}
      </div>
    </div>
  );
}
