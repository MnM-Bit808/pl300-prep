import rawBank from '../../pl300-bank/questions/all_questions.json';
import { buildBank } from '@/bank/build';
import type { Question, QuestionOf, QuestionType } from '@/bank/schema';
import { emptyAnswer, isComplete, layoutFor } from './answer';
import { scoreAnswer, verdictOf } from './scoring';

const bank = buildBank(rawBank);
function get<T extends QuestionType>(id: string, type: T): QuestionOf<T> {
  const q: Question | undefined = bank.questionById.get(id);
  if (!q || q.type !== type) throw new Error(`${id} is not a ${type} question`);
  return q as QuestionOf<T>;
}

// PRE-001 single (A) · PRE-016 multi (B, D of 2) · PRE-007 yesno (Y N Y)
// PRE-012 order (A B C D from A–F) · PRE-014 dropdown (parts 1, 1)
const single = get('PRE-001', 'single');
const multi = get('PRE-016', 'multi');
const yesno = get('PRE-007', 'yesno');
const order = get('PRE-012', 'order');
const dropdown = get('PRE-014', 'dropdown');

describe('scoreAnswer', () => {
  it('single is all or nothing', () => {
    expect(scoreAnswer(single, { type: 'single', choice: 'A' })).toMatchObject({
      earned: 1,
      possible: 1,
    });
    expect(scoreAnswer(single, { type: 'single', choice: 'B' })).toMatchObject({
      earned: 0,
      possible: 1,
    });
  });

  it('multi gives a point per correct pick, whatever the order', () => {
    expect(scoreAnswer(multi, { type: 'multi', choices: ['D', 'B'] })).toEqual({
      earned: 2,
      possible: 2,
      parts: [true, true],
    });
    expect(scoreAnswer(multi, { type: 'multi', choices: ['B', 'A'] })).toEqual({
      earned: 1,
      possible: 2,
      parts: [true, false],
    });
  });

  it('multi ignores picks beyond selectCount', () => {
    expect(scoreAnswer(multi, { type: 'multi', choices: ['A', 'B', 'D'] }).earned).toBe(1);
  });

  it('yesno scores each statement', () => {
    const s = scoreAnswer(yesno, { type: 'yesno', values: [true, true, true] });
    expect(s).toEqual({ earned: 2, possible: 3, parts: [true, false, true] });
    expect(verdictOf(s)).toBe('partial');
  });

  it('order needs the exact sequence', () => {
    expect(scoreAnswer(order, { type: 'order', sequence: ['A', 'B', 'C', 'D'] }).earned).toBe(1);
    expect(scoreAnswer(order, { type: 'order', sequence: ['A', 'B', 'D', 'C'] })).toEqual({
      earned: 0,
      possible: 1,
      parts: [true, true, false, false],
    });
  });

  it('order rejects a correct prefix, and an extra distractor', () => {
    expect(scoreAnswer(order, { type: 'order', sequence: ['A', 'B', 'C'] }).earned).toBe(0);
    expect(scoreAnswer(order, { type: 'order', sequence: ['A', 'B', 'C', 'D', 'E'] }).earned).toBe(
      0,
    );
  });

  it('dropdown scores each part', () => {
    expect(scoreAnswer(dropdown, { type: 'dropdown', picks: [1, 1] })).toMatchObject({
      earned: 2,
      possible: 2,
    });
    expect(verdictOf(scoreAnswer(dropdown, { type: 'dropdown', picks: [0, 0] }))).toBe('wrong');
  });

  it('refuses an answer of the wrong type', () => {
    expect(() => scoreAnswer(single, { type: 'multi', choices: [] })).toThrow();
  });
});

describe('isComplete', () => {
  it('waits until every part is answered', () => {
    expect(isComplete(single, emptyAnswer(single))).toBe(false);
    expect(isComplete(multi, { type: 'multi', choices: ['A'] })).toBe(false);
    expect(isComplete(multi, { type: 'multi', choices: ['A', 'B'] })).toBe(true);
    expect(isComplete(yesno, { type: 'yesno', values: [true, null, false] })).toBe(false);
    expect(isComplete(dropdown, { type: 'dropdown', picks: [0, 2] })).toBe(true);
  });

  it('lets order be checked with any number of steps placed', () => {
    expect(isComplete(order, { type: 'order', sequence: [] })).toBe(false);
    expect(isComplete(order, { type: 'order', sequence: ['F'] })).toBe(true);
  });
});

describe('layoutFor', () => {
  it('is stable for a seed and covers every id', () => {
    const a = layoutFor(order, 42);
    expect(layoutFor(order, 42)).toEqual(a);
    expect([...a.order].sort()).toEqual(order.items.map((i) => i.id).sort());
  });

  it('actually shuffles order items, which are stored in answer order', () => {
    const stored = order.items.map((i) => i.id).join('');
    const orders = new Set(
      Array.from({ length: 20 }, (_, seed) => layoutFor(order, seed).order.join('')),
    );
    expect(orders.size).toBeGreaterThan(5);
    expect([...orders].every((o) => o === stored)).toBe(false);
  });
});
