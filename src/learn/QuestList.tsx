/**
 * Today's quests on the Learn page: three small targets, each a link straight into the run that
 * moves it, with its progress and the XP it pays. Planned once a day from the learner's own
 * reviews, mistakes and weakest domain (see progress/quests.ts).
 */
import { useEffect } from 'react';
import { Link } from 'react-router';
import { dueIds, mistakeIds } from '@/practice/select';
import { useProgress, useProgressStore } from '@/progress/hooks';
import {
  focusDomain,
  planQuests,
  questProgress,
  QUEST_XP,
  rollActivity,
  type Quest,
} from '@/progress/quests';
import { FREEZE_EVERY, MAX_FREEZES } from '@/progress/xp';
import { DomainIcon } from '@/ui/domains';
import { BoltIcon, CheckIcon, RetryIcon, StepsIcon, TargetIcon } from '@/ui/icons';
import { UNIT_INFO, type Lesson, type Unit } from './course';
import { useCourse } from './useCourse';
import styles from './QuestList.module.css';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function questLabel(q: Quest): string {
  switch (q.kind) {
    case 'reviews':
      return `Clear ${plural(q.target, 'review', 'reviews')}`;
    case 'fixes':
      return `Fix ${plural(q.target, 'mistake', 'mistakes')}`;
    case 'domain':
      return `Answer ${q.target} questions in ${UNIT_INFO[q.domain!].title}`;
    case 'lesson':
      return 'Finish a lesson';
    case 'answer':
      return `Answer ${q.target} questions`;
  }
}

function questHref(q: Quest, nextLesson: Lesson | undefined): string {
  switch (q.kind) {
    case 'reviews':
      return '/practice/run?mode=review';
    case 'fixes':
      return '/practice/run?mode=mistakes';
    case 'domain':
      return `/practice/run?mode=custom&domain=${q.domain}&n=10`;
    case 'lesson':
      return nextLesson ? `/learn/${nextLesson.id}` : '/';
    case 'answer':
      return `/practice/run?mode=custom&n=${q.target}`;
  }
}

function QuestIcon({ quest }: { quest: Quest }) {
  if (quest.kind === 'domain') return <DomainIcon domain={quest.domain!} />;
  const Icon =
    quest.kind === 'reviews'
      ? RetryIcon
      : quest.kind === 'fixes'
        ? TargetIcon
        : quest.kind === 'lesson'
          ? StepsIcon
          : BoltIcon;
  return <Icon aria-hidden="true" />;
}

export function QuestList({ next }: { next: { unit: Unit; lesson: Lesson } | null }) {
  const { bank } = useCourse();
  const doc = useProgress();
  const store = useProgressStore();
  const today = store.today();
  const planned = doc.quests.date === today;

  // Plan today's quests the first time Learn opens each day; they stay fixed for the day.
  useEffect(() => {
    if (planned) return;
    store.planQuests(
      planQuests({
        due: dueIds(bank, doc, today).length,
        mistakes: mistakeIds(bank, doc).length,
        focus: focusDomain(doc.questions),
        nextLessonDomain: next?.unit.domain ?? null,
      }),
    );
  }, [planned, store, bank, doc, today, next]);

  if (!planned) return null;
  const activity = rollActivity(doc.activity, today);
  const { quests, done } = doc.quests;
  const freezeNote =
    doc.xp.freezes >= MAX_FREEZES
      ? `You hold ${MAX_FREEZES} streak freezes, the most you can keep.`
      : `Meet your daily goal on ${FREEZE_EVERY} days to earn a streak freeze (${doc.xp.goalDays ?? 0} of ${FREEZE_EVERY} so far). A freeze covers a day you miss.`;

  return (
    <section className={styles.quests} aria-labelledby="quests-title">
      <div className={styles.head}>
        <h2 id="quests-title" className={styles.title}>
          Today’s quests
        </h2>
        <p className={styles.count}>
          {done.length} of {quests.length} done
        </p>
      </div>
      <ul className={styles.list}>
        {quests.map((q) => {
          const progress = questProgress(q, activity);
          const isDone = done.includes(q.id);
          const label = questLabel(q);
          const body = (
            <>
              <span className={styles.icon} data-domain={q.domain}>
                {isDone ? <CheckIcon aria-hidden="true" /> : <QuestIcon quest={q} />}
              </span>
              <span className={styles.text}>
                <span className={styles.label}>{label}</span>
                <span className={styles.progress}>
                  {isDone ? (
                    `Done, +${QUEST_XP} XP`
                  ) : (
                    <>
                      {progress} of {q.target}
                      <span className={styles.bar} aria-hidden="true">
                        <span data-fill style={{ width: `${(progress / q.target) * 100}%` }} />
                      </span>
                    </>
                  )}
                </span>
              </span>
              {!isDone && <span className={styles.reward}>+{QUEST_XP} XP</span>}
            </>
          );
          return (
            <li key={q.id} className={styles.item} data-done={isDone || undefined}>
              {isDone ? (
                <div className={styles.row}>{body}</div>
              ) : (
                <Link
                  to={questHref(q, next?.lesson)}
                  className={styles.row}
                  aria-label={`${label}: ${progress} of ${q.target}. Earns ${QUEST_XP} XP.`}
                >
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      <p className={styles.note}>{freezeNote}</p>
    </section>
  );
}
