import rawBank from '../../pl300-bank/questions/all_questions.json';
import { buildBank } from '@/bank/load';
import type { QuestionOf } from '@/bank/schema';
import { seededRandom } from '@/lib/random';
import { apportion, buildMock, examDomain, MOCK_MINUTES, MOCK_SIZE } from './build';
import { currentId, examReducer, startExam, type ExamState } from './exam';
import { fullyCorrect, scoreQuestions, summarise } from './score';

const bank = buildBank(rawBank);
const NOW = new Date('2026-10-14T09:00:00Z');

describe('apportion', () => {
  it('adds up exactly and follows the weights', () => {
    const w = { prepare: 0.275, model: 0.275, visualize: 0.275, manage: 0.175 };
    expect(apportion(44, w)).toEqual({ prepare: 12, model: 12, visualize: 12, manage: 8 });
    expect(apportion(43, w)).toEqual({ prepare: 12, model: 12, visualize: 12, manage: 7 });
    for (let n = 1; n <= 60; n++) {
      expect(Object.values(apportion(n, w)).reduce((a, b) => a + b, 0)).toBe(n);
    }
  });
});

describe('buildMock', () => {
  const sections = buildMock(bank, [], seededRandom(7));
  const [main, cs] = sections;

  it('has 50 unique questions: a weighted first section, then one whole case', () => {
    const all = sections.flatMap((s) => s.questionIds);
    expect(all).toHaveLength(MOCK_SIZE);
    expect(new Set(all).size).toBe(MOCK_SIZE);
    expect(cs!.kind).toBe('case');
    const caseQs = bank.questions.filter((q) => q.caseId === cs!.caseId).map((q) => q.id);
    expect(cs!.questionIds).toEqual(caseQs);
    expect(main!.questionIds.every((id) => bank.questionById.get(id)!.domain !== 'case')).toBe(
      true,
    );
  });

  it('keeps section 1 within the exam domain ranges', () => {
    const n = main!.questionIds.length;
    const share = (d: string) =>
      main!.questionIds.filter((id) => bank.questionById.get(id)!.domain === d).length / n;
    for (const d of ['prepare', 'model', 'visualize']) {
      expect(share(d)).toBeGreaterThanOrEqual(0.25);
      expect(share(d)).toBeLessThanOrEqual(0.3);
    }
    expect(share('manage')).toBeGreaterThanOrEqual(0.15);
    expect(share('manage')).toBeLessThanOrEqual(0.2);
  });

  it('rotates case studies and avoids the previous mock’s questions', () => {
    const history = [
      {
        caseId: cs!.caseId!,
        sections,
        submittedAt: '2026-10-13T10:00:00Z',
      },
    ];
    const next = buildMock(bank, history, seededRandom(8));
    expect(next[1]!.caseId).not.toBe(cs!.caseId);
    const before = sections.flatMap((s) => s.questionIds);
    const overlap = next[0]!.questionIds.filter((id) => before.includes(id));
    expect(overlap).toHaveLength(0);
  });

  it('cycles through all four cases before repeating one', () => {
    const used: string[] = [];
    const history: {
      caseId: string;
      sections: { questionIds: string[] }[];
      submittedAt: string;
    }[] = [];
    for (let i = 0; i < 4; i++) {
      const m = buildMock(bank, history, seededRandom(i + 20));
      used.push(m[1]!.caseId!);
      history.push({
        caseId: m[1]!.caseId!,
        sections: [],
        submittedAt: `2026-10-0${i + 1}T10:00:00Z`,
      });
    }
    expect(new Set(used).size).toBe(4);
  });

  it('counts case questions towards the exam domain they test', () => {
    const q = bank.questionById.get('CASE-001')!; // subtopic "Prepare the data"
    expect(examDomain(q)).toBe('prepare');
  });
});

describe('exam reducer', () => {
  const sections = buildMock(bank, [], seededRandom(3));
  const fresh = () => startExam(bank, sections, NOW);
  const act = (s: ExamState, ...actions: Parameters<typeof examReducer>[1][]) =>
    actions.reduce(examReducer, s);

  it('starts with a 100-minute clock and every question empty', () => {
    const s = fresh();
    expect(s.endsAt - NOW.getTime()).toBe(MOCK_MINUTES * 60_000);
    expect(Object.keys(s.answers)).toHaveLength(MOCK_SIZE);
    expect(s.section).toBe(0);
  });

  it('moves freely within a section; Next on the last question opens the review', () => {
    let s = act(fresh(), { type: 'next' }, { type: 'next' }, { type: 'prev' });
    expect(s.index).toBe(1);
    s = act(s, { type: 'goto', index: 999 });
    expect(s.index).toBe(sections[0]!.questionIds.length - 1);
    s = act(s, { type: 'next' });
    expect(s.view).toBe('review');
  });

  it('marks and unmarks for review', () => {
    const id = currentId(fresh())!;
    const s = act(fresh(), { type: 'toggleMark', questionId: id });
    expect(s.marked).toEqual([id]);
    expect(act(s, { type: 'toggleMark', questionId: id }).marked).toEqual([]);
  });

  it('finishing section 1 locks it: its answers can no longer change', () => {
    const first = sections[0]!.questionIds[0]!;
    const q = bank.questionById.get(first)!;
    let s = act(fresh(), { type: 'finishSection', at: '2026-10-14T09:30:00Z' });
    expect(s.section).toBe(1);
    expect(s.locked).toEqual([0]);
    const before = s.answers[first];
    s = act(s, { type: 'answer', questionId: first, answer: { type: 'single', choice: 'A' } });
    expect(s.answers[first]).toBe(before);
    expect(q).toBeDefined();
  });

  it('finishing the last section submits; time up submits from anywhere', () => {
    const done = act(
      fresh(),
      { type: 'finishSection', at: 'a' },
      { type: 'finishSection', at: 'b' },
    );
    expect(done.submitted).toEqual({ at: 'b', timedOut: false });
    const timed = act(fresh(), { type: 'timeUp', at: 'c' });
    expect(timed.submitted).toEqual({ at: 'c', timedOut: true });
    expect(timed.locked).toEqual([0, 1]);
    // Nothing changes after submission.
    expect(act(timed, { type: 'next' })).toBe(timed);
  });
});

describe('scoring', () => {
  it('scores unanswered questions as zero and right answers as full marks', () => {
    const q = bank.questionById.get('PRE-001') as QuestionOf<'single'>;
    const sections = [{ questionIds: ['PRE-001', 'PRE-002'] }];
    const results = scoreQuestions(bank, sections, {
      'PRE-001': { type: 'single', choice: q.answer },
    });
    expect(results.map(fullyCorrect)).toEqual([true, false]);
    const s = summarise(bank, results);
    expect(s).toMatchObject({ marks: 1, total: 2, scaled: 500, passed: false });
    expect(s.byDomain.prepare).toEqual({ marks: 1, total: 2 });
  });

  it('gives partial credit, each question worth one mark', () => {
    // PRE-007 yes/no: Yes, No, Yes. Two of three right → 2/3 of a mark.
    const results = scoreQuestions(bank, [{ questionIds: ['PRE-007'] }], {
      'PRE-007': { type: 'yesno', values: [true, true, true] },
    });
    expect(results[0]!.credit).toBeCloseTo(2 / 3);
    expect(summarise(bank, results).scaled).toBe(667);
  });

  it('passes at 700', () => {
    const ids = [
      'PRE-001',
      'PRE-002',
      'PRE-003',
      'PRE-004',
      'PRE-005',
      'PRE-008',
      'PRE-009',
      'PRE-010',
      'PRE-011',
      'PRE-013',
    ];
    const answers = Object.fromEntries(
      ids.slice(0, 7).map((id) => {
        const q = bank.questionById.get(id) as QuestionOf<'single'>;
        return [id, { type: 'single' as const, choice: q.answer }];
      }),
    );
    const s = summarise(bank, scoreQuestions(bank, [{ questionIds: ids }], answers));
    expect(s.scaled).toBe(700);
    expect(s.passed).toBe(true);
  });

  it('skips questions no longer in the bank', () => {
    expect(scoreQuestions(bank, [{ questionIds: ['GONE-1', 'PRE-001'] }], {})).toHaveLength(1);
  });
});
