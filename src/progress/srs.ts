/**
 * Spaced repetition with Leitner boxes (BUILD_PROMPT 4.4).
 *
 * Every question you answer, in any mode, enters box 1. A fully correct answer moves it up one
 * box and schedules it further out; anything less sends it back to box 1, due tomorrow.
 * "Due" means its date is today or earlier. Dates are local calendar days (YYYY-MM-DD).
 */
import { addDays, daysBetween } from './xp';

export { addDays };

/** Days until the next review, by box (box 1 = index 0). */
export const BOX_INTERVALS = [1, 3, 7, 14, 30] as const;
export const TOP_BOX = BOX_INTERVALS.length;

export interface SrsCard {
  box: number;
  due: string;
}

/** Where a question goes after an answer. */
export function schedule(prev: SrsCard | undefined, fullyCorrect: boolean, today: string): SrsCard {
  if (!fullyCorrect) return { box: 1, due: addDays(today, BOX_INTERVALS[0]) };
  // A first sighting answered right starts in box 2: you clearly know it a little.
  const box = Math.min(TOP_BOX, prev ? prev.box + 1 : 2);
  return { box, due: addDays(today, BOX_INTERVALS[box - 1]!) };
}

export const isDue = (card: SrsCard, today: string) => daysBetween(card.due, today) >= 0;
