import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { Suspense } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import rawBank from '../../pl300-bank/questions/all_questions.json';
import { buildBank } from '@/bank/load';
import type { QuestionOf } from '@/bank/schema';
import { ProgressProvider } from '@/progress/ProgressProvider';
import { ProgressStore } from '@/progress/store';
import { memoryStorage } from '@/storage/db';
import type { MockSection } from './build';
import { startExam } from './exam';
import { ExamScreen } from './ExamScreen';
import { ResultsPage } from './ResultsPage';

const bank = buildBank(rawBank);
const pre1 = bank.questionById.get('PRE-001') as QuestionOf<'single'>;
const cs2 = bank.questions.filter((q) => q.caseId === 'CS2').map((q) => q.id);
// A small exam with the real shape: two questions, then a case section.
const SECTIONS: MockSection[] = [
  { kind: 'main', questionIds: ['PRE-001', 'PRE-002'] },
  { kind: 'case', questionIds: cs2, caseId: 'CS2' },
];

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});

async function renderExam(now = new Date()) {
  const store = await ProgressStore.open(memoryStorage());
  store.saveMockDraft(startExam(bank, SECTIONS, now));
  const router = createMemoryRouter(
    [
      { path: '/mock/exam', element: <ExamScreen /> },
      { path: '/mock/results/:id', element: <ResultsPage /> },
    ],
    { initialEntries: ['/mock/exam'] },
  );
  await act(async () => {
    render(
      <ProgressProvider store={store}>
        <Suspense fallback={<p>Loading</p>}>
          <RouterProvider router={router} />
        </Suspense>
      </ProgressProvider>,
    );
  });
  return { store, router };
}

const confirmWith = async (name: string) => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
};

describe('mock exam flow', () => {
  it('answers, marks, reviews, locks section 1, then scores the exam', async () => {
    const { store, router } = await renderExam();
    expect(screen.getByText('Section 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument();
    // The clock is real: allow a few seconds between starting the exam and the first render on a
    // loaded test machine.
    expect(screen.getByRole('timer')).toHaveAccessibleName(/Time left 1:(40:00|39:5\d)/);
    // No feedback while answering: no Check button.
    expect(screen.queryByRole('button', { name: 'Check' })).toBeNull();

    // Q1 (whichever is first after shuffling section order: section order is fixed here).
    fireEvent.click(
      screen
        .getAllByRole('radio')
        .find((r) =>
          r
            .closest('label')
            ?.textContent?.includes(pre1.options.find((o) => o.id === pre1.answer)!.text),
        )!,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Mark for review' }));
    expect(screen.getByRole('button', { name: 'Marked' })).toHaveAttribute('aria-pressed', 'true');
    // The draft is saved after every change.
    expect(store.getMockDraft()?.marked).toEqual(['PRE-001']);

    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(screen.getByText('Question 2 of 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Review section/ }));

    expect(screen.getByRole('heading', { name: 'Review section 1' })).toBeInTheDocument();
    expect(screen.getByText(/1 of 2 answered, 1 marked for review/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Question 1, answered, marked for review' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Question 2, not answered' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Finish section 1' }));
    const dialog = screen.getByRole('dialog', { name: 'Finish section 1?' });
    expect(within(dialog).getByText(/1 question isn’t fully answered/)).toBeInTheDocument();
    expect(within(dialog).getByText(/can’t come back to this section/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Finish section' }));

    // Section 2: the case study, with section 1 locked.
    expect(screen.getByText('Section 2 of 2: Contoso Clinics')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Read case' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Questions/ }));
    expect(screen.getByText('Section 1 is finished and locked.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close question map' }));

    // End early and score.
    fireEvent.click(screen.getByRole('button', { name: /End exam/ }));
    await confirmWith('End and score');

    expect(router.state.location.pathname).toMatch(/^\/mock\/results\/mock-/);
    expect(await screen.findByText('out of 1,000')).toBeInTheDocument();
    const doc = store.getSnapshot();
    expect(doc.mocks).toHaveLength(1);
    expect(doc.mocks[0]!.score).toMatchObject({ marks: 1, total: 2 + cs2.length });
    expect(store.getMockDraft()).toBeNull();
    // Answered questions count as first tries; untouched ones aren't attempts.
    expect(doc.srs['PRE-001']?.box).toBe(2);
    expect(doc.questions['PRE-002']).toBeUndefined();

    // Review: filter to what wasn't fully correct.
    fireEvent.click(screen.getByRole('button', { name: /Not fully correct/ }));
    expect(
      screen.getAllByRole('listitem').filter((li) => li.querySelector('details')),
    ).toHaveLength(1 + cs2.length);
  });

  it('submits by itself when the time has already run out (late resume)', async () => {
    const { store } = await renderExam(new Date(Date.now() - 101 * 60_000));
    expect(
      await screen.findByText('Time’s up: the exam was submitted automatically.'),
    ).toBeInTheDocument();
    expect(store.getSnapshot().mocks[0]!.timedOut).toBe(true);
  });
});
