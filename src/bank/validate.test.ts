import rawBank from '../../pl300-bank/questions/all_questions.json';
import { bankStats } from './stats';
import { validateBank } from './validate';

const clone = <T>(v: T): T => structuredClone(v);

/** A minimal valid bank with one question of each type and one case. */
function fixture() {
  const base = {
    topic: 'T',
    subtopic: 'S',
    difficulty: 1,
    stem: 'Stem',
    image: null,
    explanation: 'Because.',
    takeaway: 'Rule.',
  };
  const opts = [
    { id: 'A', text: 'a' },
    { id: 'B', text: 'b' },
    { id: 'C', text: 'c' },
  ];
  return {
    bank: 'test',
    schemaVersion: 2,
    count: 6,
    cases: [{ id: 'CS1', title: 'Case', tabs: [{ title: 'Overview', paragraphs: ['p'], image: null }] }],
    questions: [
      { ...base, id: 'PRE-001', domain: 'prepare', type: 'single', options: opts, answer: 'A' },
      { ...base, id: 'MOD-001', domain: 'model', type: 'multi', options: opts, selectCount: 2, answer: ['A', 'B'] },
      { ...base, id: 'VIS-001', domain: 'visualize', type: 'yesno', statements: ['x', 'y'], answer: [true, false] },
      { ...base, id: 'MAN-001', domain: 'manage', type: 'order', items: opts, answer: ['B', 'A'] },
      {
        ...base,
        id: 'PRE-002',
        domain: 'prepare',
        type: 'dropdown',
        parts: [{ label: 'L', options: ['x', 'y'] }],
        answer: { parts: [1] },
      },
      { ...base, id: 'CASE-001', domain: 'case', caseId: 'CS1', type: 'single', options: opts, answer: 'C' },
    ] as Record<string, unknown>[],
  };
}

const errorsFor = (bank: unknown) => validateBank(bank).issues.filter((i) => i.level === 'error');

describe('validateBank on the real bank', () => {
  const result = validateBank(rawBank);

  it('loads every question with no errors or warnings', () => {
    expect(result.issues).toEqual([]);
    expect(result.questions).toHaveLength(440);
    expect(result.cases).toHaveLength(4);
  });

  it('matches the counts in BUILD_PROMPT.md', () => {
    const stats = bankStats(result.questions, result.cases);
    expect(stats.byDomain).toEqual({ prepare: 132, model: 120, visualize: 106, manage: 57, case: 25 });
    expect(stats.byType).toEqual({ single: 366, multi: 4, yesno: 27, order: 11, dropdown: 32 });
    expect(stats.withImages).toBe(92);
    expect(new Set(result.images.map((i) => i.image.src)).size).toBe(94);
  });
});

describe('validateBank rules', () => {
  it('accepts the fixture', () => {
    const result = validateBank(fixture());
    expect(result.issues).toEqual([]);
    expect(result.questions).toHaveLength(6);
  });

  it('rejects a file that is not a bank', () => {
    expect(errorsFor({ hello: 'world' })[0]?.ref).toBe('bank');
  });

  it.each([
    ['single answer not an option', (b: ReturnType<typeof fixture>) => (b.questions[0]!.answer = 'Z'), 'PRE-001'],
    ['multi answer count ≠ selectCount', (b: ReturnType<typeof fixture>) => (b.questions[1]!.answer = ['A']), 'MOD-001'],
    ['yesno lengths differ', (b: ReturnType<typeof fixture>) => (b.questions[2]!.answer = [true]), 'VIS-001'],
    ['order answer not an item', (b: ReturnType<typeof fixture>) => (b.questions[3]!.answer = ['A', 'Q']), 'MAN-001'],
    ['dropdown index out of range', (b: ReturnType<typeof fixture>) => (b.questions[4]!.answer = { parts: [5] }), 'PRE-002'],
    ['unknown caseId', (b: ReturnType<typeof fixture>) => (b.questions[5]!.caseId = 'CS9'), 'CASE-001'],
    ['id prefix ≠ domain', (b: ReturnType<typeof fixture>) => (b.questions[0]!.domain = 'model'), 'PRE-001'],
    ['unknown type', (b: ReturnType<typeof fixture>) => (b.questions[0]!.type = 'hotspot'), 'PRE-001'],
    ['bad image path', (b: ReturnType<typeof fixture>) => (b.questions[0]!.image = { src: 'x.png', alt: 'a' }), 'PRE-001'],
  ])('drops the question when: %s', (_name, breakIt, ref) => {
    const bank = clone(fixture());
    breakIt(bank);
    const result = validateBank(bank);
    expect(result.issues.some((i) => i.level === 'error' && i.ref === ref)).toBe(true);
    expect(result.questions.map((q) => q.id)).not.toContain(ref);
    expect(result.questions).toHaveLength(5);
  });

  it('keeps the first of two questions with the same id', () => {
    const bank = clone(fixture());
    bank.questions.push(clone(bank.questions[0]!));
    const result = validateBank(bank);
    expect(result.questions.filter((q) => q.id === 'PRE-001')).toHaveLength(1);
    expect(result.issues).toContainEqual({ level: 'error', ref: 'PRE-001', message: 'duplicate id' });
  });

  it('warns about unknown fields without dropping the question', () => {
    const bank = clone(fixture());
    bank.questions[0]!.hint = 'nope';
    const result = validateBank(bank);
    expect(result.questions).toHaveLength(6);
    expect(result.issues).toContainEqual({ level: 'warning', ref: 'PRE-001', message: 'unknown field "hint"' });
  });
});
