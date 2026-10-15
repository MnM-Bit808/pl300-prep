/**
 * Streak, XP and today's goal in one slim line above the next lesson. Nothing reads as a bare
 * zero: before the first XP the strip says how to start instead. The goal is set in Settings.
 */
import { BoltIcon, FlameIcon, SnowflakeIcon } from '@/ui/icons';
import { useProgress, useProgressStore } from './hooks';
import { rollDay, streakActiveToday } from './xp';
import styles from './StatsStrip.module.css';

export function StatsStrip() {
  const doc = useProgress();
  const store = useProgressStore();
  const today = store.today();
  const xp = rollDay(doc.xp, today);
  const lit = streakActiveToday(xp, today);
  const goalPct = Math.min(1, xp.daily.xp / xp.goal);
  const days = xp.streak.count;

  return (
    <section className={styles.strip} aria-label="Your progress">
      <p className={styles.stat} data-lit={lit || undefined}>
        <FlameIcon className={styles.icon} />
        {days > 0 ? (
          <span>
            <strong>{days}</strong>-day streak
            {xp.frozeOn === today ? (
              <span className={styles.hint}>. A streak freeze covered the day you missed</span>
            ) : (
              !lit && <span className={styles.hint}>. Earn XP today to keep it</span>
            )}
          </span>
        ) : (
          <span>Start a streak today</span>
        )}
      </p>
      {xp.freezes > 0 && (
        <p className={styles.stat} data-frost>
          <SnowflakeIcon className={styles.icon} />
          <span>
            <strong>{xp.freezes}</strong> streak {xp.freezes === 1 ? 'freeze' : 'freezes'}
          </span>
        </p>
      )}
      {xp.total > 0 && (
        <p className={styles.stat}>
          <BoltIcon className={styles.icon} />
          <span>
            <strong>{xp.total}</strong> XP
          </span>
        </p>
      )}
      <div className={styles.goal}>
        <span id="goal-label" className={styles.goalText}>
          {goalPct >= 1 ? 'Daily goal met: ' : 'Today: '}
          <strong>{xp.daily.xp}</strong> of {xp.goal} XP
        </span>
        <div
          className={styles.bar}
          role="progressbar"
          aria-labelledby="goal-label"
          aria-valuemin={0}
          aria-valuemax={xp.goal}
          aria-valuenow={Math.min(xp.daily.xp, xp.goal)}
        >
          <span data-fill style={{ width: `${goalPct * 100}%` }} />
        </div>
      </div>
    </section>
  );
}
