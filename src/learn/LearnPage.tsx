/**
 * The Learn path. Each unit reads like a query's "Applied steps" pane in Power Query: lessons
 * are steps applied in order, joined by a line, ticked off as they're done.
 */
import { Link } from 'react-router';
import { dueIds, mistakeIds } from '@/practice/select';
import { useProgress } from '@/progress/hooks';
import { localDay } from '@/progress/xp';
import { StatsStrip } from '@/progress/StatsStrip';
import { CheckIcon, ChevronRightIcon, LockIcon } from '@/ui/icons';
import { lessonTitle, type Lesson, type Unit } from './course';
import { lessonState, unitDone, upNext, type LessonState } from './rules';
import { useCourse } from './useCourse';
import styles from './LearnPage.module.css';

const pct = (n: number) => `${Math.round(n * 100)}%`;

function LessonRow({ lesson, unit, state }: { lesson: Lesson; unit: Unit; state: LessonState }) {
  const doc = useProgress();
  const record = doc.lessons[lesson.id];
  const title = lessonTitle(lesson);
  const count = `${lesson.questionIds.length} questions`;

  const marker = (
    <span className={styles.marker} aria-hidden="true">
      {state === 'done' ? <CheckIcon /> : state === 'locked' ? <LockIcon /> : lesson.number}
    </span>
  );

  const detail =
    state === 'done' && record
      ? `${count}, best first-try score ${pct(record.bestAccuracy)}`
      : state === 'locked'
        ? `${count}. Finish lesson ${lesson.number - 1} to unlock`
        : count;

  const body = (
    <>
      {marker}
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>
          <span className="sr-only">Lesson {lesson.number}: </span>
          {title}
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
    <li className={styles.row} data-state={state}>
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

function UnitSection({ unit, open }: { unit: Unit; open: boolean }) {
  const doc = useProgress();
  const done = unitDone(unit, doc);
  const total = unit.lessons.length;
  const headingId = `unit-${unit.domain}`;

  return (
    <details className={styles.unit} open={open}>
      <summary className={styles.summary}>
        <span className={styles.unitHead}>
          <h2 id={headingId} className={styles.unitTitle}>
            {unit.title}
          </h2>
          <span className={styles.unitMeta}>{unit.weight}</span>
        </span>
        <span className={styles.unitProgress}>
          <span className={styles.unitCount}>
            {done} of {total}
            <span className="sr-only"> lessons done</span>
          </span>
          <span className={styles.unitBar} aria-hidden="true">
            <span style={{ width: `${(done / total) * 100}%` }} />
          </span>
        </span>
      </summary>
      <div className={styles.steps}>
        <p className={styles.stepsLabel}>Applied steps</p>
        <ol className={styles.list} aria-labelledby={headingId}>
          {unit.lessons.map((l) => (
            <LessonRow key={l.id} lesson={l} unit={unit} state={lessonState(l, unit, doc)} />
          ))}
        </ol>
      </div>
    </details>
  );
}

/** Today's review queues, on the home screen (BUILD_PROMPT 4.4). Hidden until there's history. */
function ReviewStrip() {
  const { bank } = useCourse();
  const doc = useProgress();
  if (!Object.keys(doc.questions).length) return null;
  const due = dueIds(bank, doc, localDay()).length;
  const mistakes = mistakeIds(bank, doc).length;
  return (
    <section className={styles.review} aria-label="Reviews">
      <Link to={due ? '/practice/run?mode=review' : '/practice'} className={styles.reviewItem}>
        <strong>{due}</strong>
        <span>{due === 1 ? 'review due today' : 'reviews due today'}</span>
      </Link>
      <Link
        to={mistakes ? '/practice/run?mode=mistakes' : '/practice'}
        className={styles.reviewItem}
      >
        <strong>{mistakes}</strong>
        <span>{mistakes === 1 ? 'mistake to fix' : 'mistakes to fix'}</span>
      </Link>
    </section>
  );
}

export function LearnPage() {
  const { course } = useCourse();
  const doc = useProgress();
  const next = upNext(course, doc);
  const anyDone = Object.keys(doc.lessons).length > 0;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Learn</h1>
      <StatsStrip />

      {next ? (
        <section className={styles.next} aria-labelledby="up-next">
          <div>
            <h2 id="up-next" className={styles.nextLabel}>
              {anyDone ? 'Up next' : 'Start here'}
            </h2>
            <p className={styles.nextTitle}>{lessonTitle(next.lesson)}</p>
            <p className={styles.nextMeta}>
              {next.unit.title}, lesson {next.lesson.number} of {next.unit.lessons.length}.{' '}
              {next.lesson.questionIds.length} questions.
            </p>
          </div>
          <Link to={`/learn/${next.lesson.id}`} className={styles.nextBtn}>
            {anyDone ? 'Continue' : 'Start lesson'}
          </Link>
        </section>
      ) : (
        <section className={styles.next} aria-labelledby="up-next">
          <div>
            <h2 id="up-next" className={styles.nextLabel}>
              Every lesson done
            </h2>
            <p className={styles.nextMeta}>
              Redo any lesson below, or move on to practice and mock exams.
            </p>
          </div>
        </section>
      )}

      <ReviewStrip />

      <Link to="/concepts" className={styles.concepts}>
        <span className={styles.conceptsTitle}>Concept simulators</span>
        <span className={styles.conceptsText}>
          Join kinds, Append vs Merge, filter context, star vs snowflake: change the inputs and
          watch what happens.
        </span>
      </Link>

      <div className={styles.units}>
        {course.units.map((u) => (
          <UnitSection
            key={u.domain}
            unit={u}
            open={next ? next.unit.domain === u.domain : false}
          />
        ))}
      </div>
    </div>
  );
}
