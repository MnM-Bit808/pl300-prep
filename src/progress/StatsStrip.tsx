/** Streak, total XP and today's goal: the three numbers that keep a daily habit going. */
import { BoltIcon, FlameIcon } from '@/ui/icons';
import { useProgress, useProgressStore } from './hooks';
import { GOALS, localDay, rollDay, streakActiveToday } from './xp';
import styles from './StatsStrip.module.css';

export function StatsStrip() {
  const doc = useProgress();
  const store = useProgressStore();
  const today = localDay();
  const xp = rollDay(doc.xp, today);
  const lit = streakActiveToday(xp, today);
  const goalPct = Math.min(1, xp.daily.xp / xp.goal);
  const days = xp.streak.count;

  return (
    <section className={styles.strip} aria-label="Your progress">
      <p className={styles.stat} data-lit={lit || undefined}>
        <FlameIcon className={styles.icon} />
        <span>
          <strong>{days}</strong> day streak
          {!lit && days > 0 && <span className={styles.hint}>Earn XP today to keep it</span>}
        </span>
      </p>
      <p className={styles.stat}>
        <BoltIcon className={styles.icon} />
        <span>
          <strong>{xp.total}</strong> XP
        </span>
      </p>
      <div className={styles.goal}>
        <div className={styles.goalHead}>
          <span id="goal-label">
            {goalPct >= 1 ? 'Daily goal met: ' : 'Today: '}
            <strong>{xp.daily.xp}</strong> of {xp.goal} XP
          </span>
          <label className={styles.goalPick}>
            <span className="sr-only">Daily goal</span>
            <select value={xp.goal} onChange={(e) => store.setGoal(Number(e.target.value))}>
              {GOALS.map((g) => (
                <option key={g} value={g}>
                  Goal {g} XP
                </option>
              ))}
            </select>
          </label>
        </div>
        <div
          className={styles.bar}
          role="progressbar"
          aria-labelledby="goal-label"
          aria-valuemin={0}
          aria-valuemax={xp.goal}
          aria-valuenow={Math.min(xp.daily.xp, xp.goal)}
        >
          <span style={{ width: `${goalPct * 100}%` }} />
        </div>
      </div>
    </section>
  );
}
