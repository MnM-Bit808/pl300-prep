/**
 * XP, daily goal and streak maths (rules from Paath). Pure, with the date passed in, so the
 * tests can travel through time.
 *
 * - A day counts towards the streak when any XP is earned that day.
 * - Missing a whole day resets the streak (shown as 0 until XP is earned again).
 * - Dates are local calendar days ("YYYY-MM-DD"), not UTC.
 */
export interface XpState {
  total: number;
  goal: number;
  daily: { date: string; xp: number };
  streak: { count: number; last: string };
}

export const GOALS = [20, 50, 100, 150] as const;
export const DEFAULT_GOAL = 50;

export const emptyXp = (): XpState => ({
  total: 0,
  goal: DEFAULT_GOAL,
  daily: { date: '', xp: 0 },
  streak: { count: 0, last: '' },
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

/** The state as of `today`: rolls the daily counter over and drops a broken streak. */
export function rollDay(s: XpState, today: string): XpState {
  let next = s;
  if (s.daily.date !== today) next = { ...next, daily: { date: today, xp: 0 } };
  if (s.streak.last && daysBetween(s.streak.last, today) > 1 && s.streak.count !== 0) {
    next = { ...next, streak: { ...next.streak, count: 0 } };
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
  return {
    ...rolled,
    total: rolled.total + amount,
    daily: { date: today, xp: rolled.daily.xp + amount },
    streak,
  };
}

export const streakActiveToday = (s: XpState, today: string) => s.streak.last === today;
