/**
 * XP, daily goal and streak maths (rules from Paath). Pure, with the date passed in, so the
 * tests can travel through time.
 *
 * - A day counts towards the streak when any XP is earned that day.
 * - Missing a whole day resets the streak (shown as 0 until XP is earned again).
 * - Dates are local calendar days ("YYYY-MM-DD"), not UTC.
 * - Streak freezes: every FREEZE_EVERY days the daily goal is met earns one (up to MAX_FREEZES).
 *   A gap of missed days is bridged automatically if there are enough freezes to cover it.
 */
export interface XpState {
  total: number;
  goal: number;
  daily: { date: string; xp: number };
  streak: { count: number; last: string };
  /** Streak freezes held. */
  freezes: number;
  /** Goal days counted towards the next freeze. */
  goalDays: number;
  /** The day freezes last bridged a gap (so the app can say so), or ''. */
  frozeOn: string;
}

export const FREEZE_EVERY = 5;
export const MAX_FREEZES = 2;

export const GOALS = [20, 50, 100, 150] as const;
export const DEFAULT_GOAL = 50;

export const emptyXp = (): XpState => ({
  total: 0,
  goal: DEFAULT_GOAL,
  daily: { date: '', xp: 0 },
  streak: { count: 0, last: '' },
  freezes: 0,
  goalDays: 0,
  frozeOn: '',
});

/** Local calendar date, YYYY-MM-DD. */
export const localDay = (d: Date = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Whole days from a to b (both YYYY-MM-DD). Uses UTC noon so DST shifts can't round wrong. */
export function daysBetween(a: string, b: string): number {
  const t = (s: string) => Date.parse(`${s}T12:00:00Z`);
  return Math.round((t(b) - t(a)) / 86_400_000);
}

/** The day `n` days after `day` (negative goes back). */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * The state as of `today`: rolls the daily counter over, and handles missed days. Enough
 * freezes bridge the gap (the streak carries on as if yesterday was practised); otherwise the
 * streak drops to 0.
 */
export function rollDay(s: XpState, today: string): XpState {
  let next = s;
  if (s.daily.date !== today) next = { ...next, daily: { date: today, xp: 0 } };
  const gap = s.streak.last ? daysBetween(s.streak.last, today) : 0;
  if (gap > 1 && s.streak.count !== 0) {
    const missed = gap - 1;
    const freezes = next.freezes ?? 0;
    next =
      missed <= freezes
        ? {
            ...next,
            freezes: freezes - missed,
            frozeOn: today,
            streak: { ...next.streak, last: addDays(today, -1) },
          }
        : { ...next, streak: { ...next.streak, count: 0 } };
  }
  return next;
}

export function addXp(s: XpState, amount: number, today: string): XpState {
  const rolled = rollDay(s, today);
  if (amount <= 0) return rolled;
  const continues = rolled.streak.last && daysBetween(rolled.streak.last, today) === 1;
  const streak =
    rolled.streak.last === today
      ? rolled.streak
      : { count: continues ? rolled.streak.count + 1 : 1, last: today };
  // Crossing the daily goal counts a goal day; enough of them earn a freeze.
  let freezes = rolled.freezes ?? 0;
  let goalDays = rolled.goalDays ?? 0;
  const before = rolled.daily.xp;
  if (before < rolled.goal && before + amount >= rolled.goal) {
    if (goalDays + 1 >= FREEZE_EVERY && freezes < MAX_FREEZES) {
      freezes += 1;
      goalDays = 0;
    } else {
      goalDays = Math.min(goalDays + 1, FREEZE_EVERY);
    }
  }
  return {
    ...rolled,
    total: rolled.total + amount,
    daily: { date: today, xp: before + amount },
    streak,
    freezes,
    goalDays,
  };
}

export const streakActiveToday = (s: XpState, today: string) => s.streak.last === today;
