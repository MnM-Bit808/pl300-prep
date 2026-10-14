import rawBank from '../../pl300-bank/questions/all_questions.json';
import { buildBank } from '@/bank/build';
import type { AttemptRecord } from '@/storage/db';
import { analyse, bandFor, HALF_LIFE_DAYS, recencyWeight } from './analytics';
import { emptyProgress, type MockRecord, type ProgressDoc } from './store';

const bank = buildBank(rawBank);
const NOW = Date.parse('2026-10-15T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString();
const att = (questionId: string, earned: number, possible: number, days = 0): AttemptRecord => ({
  questionId,
  at: daysAgo(days),
  earned,
  possible,
  mode: 'practice',
});
const seen = (...ids: string[]): ProgressDoc['questions'] =>
  Object.fromEntries(
    ids.map((id) => [
      id,
      { attempts: 1, correct: 1, lastEarned: 1, lastPossible: 1, lastAt: daysAgo(0) },
    ]),
  );
const mock = (scaled: number, day: number): MockRecord =>
  ({ id: `m${day}`, submittedAt: daysAgo(day), score: { scaled } }) as unknown as MockRecord;

describe('recency weighting', () => {
  it('halves every half-life', () => {
    expect(recencyWeight(daysAgo(0), NOW)).toBeCloseTo(1);
    expect(recencyWeight(daysAgo(HALF_LIFE_DAYS), NOW)).toBeCloseTo(0.5);
    expect(recencyWeight(daysAgo(2 * HALF_LIFE_DAYS), NOW)).toBeCloseTo(0.25);
  });

  it('lets a recent right answer outweigh an old wrong one', () => {
    const a = analyse(
      bank,
      [att('PRE-001', 0, 1, 28), att('PRE-001', 1, 1, 0)],
      emptyProgress(),
      NOW,
    );
    // weights 0.25 (wrong) and 1 (right) → 0.8
    expect(a.domains.prepare.mastery).toBeCloseTo(0.8);
  });
});

describe('analyse', () => {
  it('starts empty: nothing seen, no estimate', () => {
    const a = analyse(bank, [], emptyProgress(), NOW);
    expect(a.seen).toBe(0);
    expect(a.total).toBe(440);
    expect(a.readiness).toBeNull();
    expect(a.domains.model.mastery).toBeNull();
  });

  it('gives partial credit and files case questions under the domain they test', () => {
    const a = analyse(bank, [att('PRE-007', 2, 3), att('CASE-001', 1, 1)], emptyProgress(), NOW);
    // CASE-001's subtopic is "Prepare the data".
    expect(a.domains.prepare.attempts).toBe(2);
    expect(a.domains.prepare.mastery).toBeCloseTo((2 / 3 + 1) / 2);
    // Coverage totals include case questions in their domain: 132 prepare + 3 case.
    expect(a.domains.prepare.total).toBe(135);
  });

  it('only calls a subtopic weak with at least three attempts', () => {
    const attempts = [
      att('PRE-001', 0, 1),
      att('PRE-002', 0, 1),
      att('PRE-003', 0, 1),
      att('MOD-040', 0, 1),
    ];
    const a = analyse(bank, attempts, emptyProgress(), NOW);
    expect(a.weakest).toHaveLength(1);
    expect(a.weakest[0]!.subtopic).toBe('Storage modes');
    expect(a.weakest[0]!.mastery).toBe(0);
  });

  it('scales the practice estimate by coverage', () => {
    const ids = bank.questions.filter((q) => q.domain === 'prepare').map((q) => q.id);
    const half = ids.slice(0, 40); // ~30% of prepare: half of the 60% needed for full coverage
    const a = analyse(
      bank,
      half.map((id) => att(id, 1, 1)),
      { ...emptyProgress(), questions: seen(...half) },
      NOW,
    );
    const coverage = 40 / 135 / 0.6;
    expect(a.practiceScore).toBe(Math.round(1000 * 0.275 * 1 * coverage));
  });

  it('weights the last three mocks 3:2:1 and blends 60/40 with practice', () => {
    const doc = {
      ...emptyProgress(),
      mocks: [mock(500, 30), mock(600, 20), mock(700, 10), mock(800, 1)],
    };
    const a = analyse(bank, [], doc, NOW);
    expect(a.mocksUsed).toBe(3);
    expect(a.mockScore).toBe(Math.round((800 * 3 + 700 * 2 + 600 * 1) / 6));
    expect(a.readiness).toBe(a.mockScore); // no practice yet
    const b = analyse(bank, [att('PRE-001', 1, 1)], { ...doc, questions: seen('PRE-001') }, NOW);
    expect(b.readiness).toBe(Math.round(0.6 * b.mockScore! + 0.4 * b.practiceScore!));
  });

  it('skips attempts for questions no longer in the bank', () => {
    expect(analyse(bank, [att('GONE-1', 1, 1)], emptyProgress(), NOW).readiness).toBeNull();
  });

  it('bands around the pass mark', () => {
    expect(bandFor(720)).toBe('on-track');
    expect(bandFor(650)).toBe('close');
    expect(bandFor(500)).toBe('not-ready');
  });
});
