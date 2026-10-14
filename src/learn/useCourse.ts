import type { Bank } from '@/bank/load';
import { useBank } from '@/bank/useBank';
import { buildCourse, type Course } from './course';

const cache = new WeakMap<Bank, Course>();

/** The Learn course for the loaded bank (built once). Suspends while the bank loads. */
export function useCourse(): { bank: Bank; course: Course } {
  const bank = useBank();
  let course = cache.get(bank);
  if (!course) {
    course = buildCourse(bank.questions, bank.cases);
    cache.set(bank, course);
  }
  return { bank, course };
}
