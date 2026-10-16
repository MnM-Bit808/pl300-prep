/**
 * The Learn page, laid out like Power Query's editor: the exam domains are the queries, and the
 * selected domain's lessons are its "Applied steps", applied in order, ticked off and highlighted
 * as they're done. What to do next leads the page.
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { useDocumentTitle } from '@/app/title';
import { DOMAIN_SHORT, type Domain } from '@/bank/constants';
import { useProgress } from '@/progress/hooks';
import { StatsStrip } from '@/progress/StatsStrip';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { DomainIcon } from '@/ui/domains';
import { Googly } from '@/ui/Googly';
import { CheckIcon, ChevronRightIcon, SlidersIcon } from '@/ui/icons';
import { lessonTitle, type Course, type Lesson, type Unit } from './course';
import { clearJustApplied, peekJustApplied } from './justApplied';
import { QuestList } from './QuestList';
import { lessonState, unitDone, upNext, type LessonState } from './rules';
import { useCourse } from './useCourse';
import styles from './LearnPage.module.css';

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** About 40 seconds a question, rounded to whole minutes. */
const minutes = (questions: number) => Math.max(1, Math.round((questions * 40) / 60));

function LessonRow({
  lesson,
  unit,
  state,
  just,
}: {
  lesson: Lesson;
  unit: Unit;
  state: LessonState;
  /** Just finished: play the highlighter sweep once. */
  just: boolean;
}) {
  const doc = useProgress();
  const record = doc.lessons[lesson.id];
  const title = lessonTitle(lesson);
  const count = `${lesson.questionIds.length} questions`;

  const detail =
    state === 'done' && record
      ? `${count}, best first-try score ${pct(record.bestAccuracy)}`
      : state === 'locked'
        ? `${count}. Unlocks after lesson ${lesson.number - 1}`
        : `${count}, about ${minutes(lesson.questionIds.length)} minutes`;

  const body = (
    <>
      <span className={styles.marker} aria-hidden="true">
        {state === 'done' ? <CheckIcon /> : state === 'locked' ? null : lesson.number}
      </span>
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>
          <span className="sr-only">Lesson {lesson.number}: </span>
          <span className={state === 'done' ? styles.applied : undefined}>{title}</span>
        </span>
        <span className={styles.rowDetail}>{detail}</span>
      </span>
      {state === 'current' && <span className={styles.start}>Start</span>}
      {(state === 'open' || state === 'done') && (
        <ChevronRightIcon className={styles.chevron} aria-hidden="true" />
      )}
    </>
  );

  return (
    <li className={styles.row} data-state={state} data-just={just || undefined}>
      {state === 'locked' ? (
        <div className={styles.rowInner} aria-disabled="true">
          {body}
        </div>
      ) : (
        <Link
          to={`/learn/${lesson.id}`}
          className={styles.rowInner}
          aria-label={`${state === 'done' ? 'Redo' : 'Start'} lesson ${lesson.number} of ${unit.title}: ${title}. ${detail}`}
        >
          {body}
        </Link>
      )}
    </li>
  );
}

/**
 * The domains as tabs (a vertical list beside the steps on wide screens, a row above them on
 * phones) and the chosen domain's lessons. Arrow keys move between domains in either layout.
 */
function CourseView({
  course,
  initial,
  just,
}: {
  course: Course;
  initial: Domain;
  just: string | null;
}) {
  const doc = useProgress();
  const [selected, setSelected] = useState<Domain>(initial);
  const wide = useMediaQuery('(min-width: 900px)');
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const units = course.units;
  const index = Math.max(
    0,
    units.findIndex((u) => u.domain === selected),
  );
  const unit = units[index]!;
  const done = unitDone(unit, doc);

  const go = (i: number) => {
    const to = (i + units.length) % units.length;
    setSelected(units[to]!.domain);
    tabs.current[to]?.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    const moves: Record<string, number> = {
      ArrowDown: index + 1,
      ArrowRight: index + 1,
      ArrowUp: index - 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: units.length - 1,
    };
    const to = moves[e.key];
    if (to === undefined) return;
    e.preventDefault();
    go(to);
  };

  return (
    <section className={styles.course} aria-label="Your course">
      <div
        className={styles.tabs}
        role="tablist"
        aria-label="Exam domains"
        aria-orientation={wide ? 'vertical' : 'horizontal'}
      >
        {units.map((u, i) => {
          const d = unitDone(u, doc);
          const isSelected = u.domain === unit.domain;
          return (
            <button
              key={u.domain}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${u.domain}`}
              aria-selected={isSelected}
              aria-controls="course-steps"
              aria-label={`${u.title}, ${d} of ${u.lessons.length} lessons done`}
              tabIndex={isSelected ? 0 : -1}
              className={styles.tab}
              data-domain={u.domain}
              onClick={() => setSelected(u.domain)}
              onKeyDown={onKey}
            >
              <DomainIcon domain={u.domain} className={styles.tabIcon} />
              <span className={styles.tabText} aria-hidden="true">
                <span className={styles.tabLong}>{u.title}</span>
                <span className={styles.tabShort}>{DOMAIN_SHORT[u.domain]}</span>
                <span className={styles.tabCount}>
                  {d} of {u.lessons.length}
                </span>
              </span>
              <span className={styles.tabBar} aria-hidden="true">
                <span data-fill style={{ width: `${(d / u.lessons.length) * 100}%` }} />
              </span>
            </button>
          );
        })}
      </div>

      <div
        className={styles.panel}
        role="tabpanel"
        id="course-steps"
        aria-labelledby={`tab-${unit.domain}`}
        data-domain={unit.domain}
      >
        <div className={styles.panelHead}>
          <h2 className={styles.panelTitle}>{unit.title}</h2>
          <p className={styles.panelMeta}>
            {unit.weight}. {done} of {unit.lessons.length} lessons done.
          </p>
        </div>
        <p className={styles.stepsLabel} id="applied-steps">
          Applied steps
        </p>
        <ol className={styles.list} aria-labelledby="applied-steps">
          {unit.lessons.map((l) => (
            <LessonRow
              key={l.id}
              lesson={l}
              unit={unit}
              state={lessonState(l, unit, doc)}
              just={l.id === just}
            />
          ))}
        </ol>
      </div>
    </section>
  );
}

export function LearnPage() {
  useDocumentTitle('Learn');
  const { course } = useCourse();
  const doc = useProgress();
  const next = upNext(course, doc);
  const anyDone = Object.keys(doc.lessons).length > 0;
  // The lesson just finished, if we've come straight from it: shown once, then forgotten.
  const [just] = useState(peekJustApplied);
  useEffect(() => clearJustApplied(), []);
  const justUnit = just ? course.lessonById.get(just)?.unit : undefined;

  return (
    <div className={styles.page}>
      <h1 className="sr-only">Learn</h1>
      <StatsStrip />

      {next ? (
        <section className={styles.next} data-domain={next.unit.domain} aria-labelledby="up-next">
          <DomainIcon domain={next.unit.domain} className={styles.nextIcon} />
          <div className={styles.nextText}>
            <h2 id="up-next" className={styles.nextTitle}>
              {anyDone ? 'Next: ' : 'Start with '}
              {lessonTitle(next.lesson)}
            </h2>
            <p className={styles.nextMeta}>
              {next.unit.title}, lesson {next.lesson.number} of {next.unit.lessons.length}.{' '}
              {next.lesson.questionIds.length} questions, about{' '}
              {minutes(next.lesson.questionIds.length)} minutes.
            </p>
          </div>
          <Link to={`/learn/${next.lesson.id}`} className={styles.nextBtn}>
            {anyDone ? 'Continue' : 'Start lesson'}
          </Link>
        </section>
      ) : (
        <section className={styles.next} aria-labelledby="up-next">
          <Googly mood="happy" blink className={styles.nextMark} />
          <div className={styles.nextText}>
            <h2 id="up-next" className={styles.nextTitle}>
              Every lesson done
            </h2>
            <p className={styles.nextMeta}>
              Redo any lesson below, or move on to practice and mock exams.
            </p>
          </div>
        </section>
      )}

      <QuestList next={next} />

      <CourseView
        course={course}
        initial={justUnit ?? next?.unit.domain ?? 'prepare'}
        just={just}
      />

      <Link to="/concepts" className={styles.concepts}>
        <SlidersIcon className={styles.conceptsIcon} aria-hidden="true" />
        <span className={styles.conceptsText}>
          <span className={styles.conceptsTitle}>Concept simulators</span>
          <span>See joins, filter context and schemas respond as you change them.</span>
        </span>
        <ChevronRightIcon className={styles.chevron} aria-hidden="true" />
      </Link>
    </div>
  );
}
