import { act, fireEvent, render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import rawBank from '../../pl300-bank/questions/all_questions.json';
import { buildBank } from '@/bank/build';
import type { QuestionOf } from '@/bank/schema';
import { ProgressProvider } from '@/progress/ProgressProvider';
import { ProgressStore } from '@/progress/store';
import { memoryStorage } from '@/storage/db';
import { FlashcardsPage } from './FlashcardsPage';
import { PracticeRun } from './PracticeRun';

const bank = buildBank(rawBank);
const NOW = () => new Date('2026-10-14T09:00:00');
const single = (id: string) => bank.questionById.get(id) as QuestionOf<'single'>;

async function renderAt(url: string, seed?: (s: ProgressStore) => void) {
  const store = await ProgressStore.open(memoryStorage(), NOW);
  seed?.(store);
  const router = createMemoryRouter(
    [
      { path: '/practice/run', element: <PracticeRun /> },
      { path: '/practice/cards', element: <FlashcardsPage /> },
      { path: '/practice', element: <p>Practice hub</p> },
    ],
    { initialEntries: [url] },
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

const pickOption = (text: string) =>
  fireEvent.click(
    screen.getAllByRole('radio').find((r) => r.closest('label')?.textContent?.includes(text))!,
  );

describe('practice runs', () => {
  it('fix mistakes: a right answer clears the mistake and moves the card up a box', async () => {
    const q = single('PRE-001');
    const { store } = await renderAt('/practice/run?mode=mistakes', (s) =>
      s.recordAnswer(q.id, { earned: 0, possible: 1 }, 'lesson'),
    );
    expect(store.getSnapshot().srs[q.id]).toEqual({ box: 1, due: '2026-10-15' });
    expect(screen.queryByText(/hearts left/)).toBeNull(); // practice has no hearts

    pickOption(q.options.find((o) => o.id === q.answer)!.text);
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(
      await screen.findByRole('heading', { name: 'All right first time' }),
    ).toBeInTheDocument();
    const doc = store.getSnapshot();
    expect(doc.srs[q.id]).toEqual({ box: 2, due: '2026-10-17' });
    expect(doc.xp.total).toBe(10);
    expect(screen.getByText('Still to fix').nextSibling).toHaveTextContent('0');
  });

  it('review: only cards due today or earlier are asked', async () => {
    await renderAt('/practice/run?mode=review', (s) => {
      // PRE-001 answered right today → due in 3 days; PRE-002 missed → due tomorrow. Neither is due.
      s.recordAnswer('PRE-001', { earned: 1, possible: 1 }, 'lesson');
      s.recordAnswer('PRE-002', { earned: 0, possible: 1 }, 'lesson');
    });
    expect(screen.getByRole('heading', { name: 'Nothing due' })).toBeInTheDocument();
  });

  it('custom: follows the URL filter', async () => {
    await renderAt('/practice/run?mode=custom&domain=model&d=3&n=5');
    const stem = document.querySelector('[id$="-stem"]')!.textContent!;
    const q = bank.questions.find((x) =>
      stem.startsWith(x.stem.split('\n')[0]!.replace(/`/g, '')),
    )!;
    expect(q.domain).toBe('model');
    expect(q.difficulty).toBe(3);
    expect(screen.getByText('of 5', { exact: false })).toBeInTheDocument();
  });
});

describe('flashcards', () => {
  const wait = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)));

  it('flips, sends a card back, and finishes the deck by keyboard', async () => {
    const subtopic = 'Storage modes';
    const size = bank.questions.filter((q) => q.subtopic === subtopic && !q.caseId).length;
    await renderAt(`/practice/cards?subtopic=${encodeURIComponent(subtopic)}`);
    expect(screen.getByText(`${size}`)).toBeInTheDocument();

    // Front visible, back inert.
    const answerFace = screen.getByLabelText('Answer', { selector: 'section' });
    expect(answerFace).toHaveAttribute('inert');
    fireEvent.keyDown(document.body, { key: ' ' });
    expect(answerFace).not.toHaveAttribute('inert');
    expect(screen.getByText('Rule to remember')).toBeInTheDocument();

    // Again: the card goes to the back, the deck stays the same size.
    fireEvent.keyDown(document.body, { key: 'ArrowLeft' });
    await wait(320);
    expect(screen.getByText(`${size}`)).toBeInTheDocument();

    for (let i = 0; i < size; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Show answer' }));
      fireEvent.keyDown(document.body, { key: 'ArrowRight' });
      await wait(320);
    }
    expect(screen.getByRole('heading', { name: 'Deck done' })).toBeInTheDocument();
    expect(screen.getByText('Needed another look').nextSibling).toHaveTextContent('1');
    expect(screen.getByText('Knew first time').nextSibling).toHaveTextContent(String(size - 1));
  });

  it('a card cannot be marked before it is turned over', async () => {
    await renderAt('/practice/cards?subtopic=Storage%20modes');
    const before = screen.getByRole('progressbar').getAttribute('aria-valuenow');
    fireEvent.keyDown(document.body, { key: 'ArrowRight' });
    await wait(320);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(before);
  });
});
