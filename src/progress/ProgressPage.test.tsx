import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { Suspense } from 'react';
import { MemoryRouter } from 'react-router';
import rawBank from '../../pl300-bank/questions/all_questions.json';
import { buildBank } from '@/bank/build';
import { memoryStorage } from '@/storage/db';
import { ProgressPage } from './ProgressPage';
import { ProgressProvider } from './ProgressProvider';
import { ProgressStore, type MockRecord } from './store';

const bank = buildBank(rawBank);

async function renderWith(seed: (s: ProgressStore) => void) {
  const store = await ProgressStore.open(memoryStorage());
  seed(store);
  await store.flush();
  await act(async () => {
    render(
      <ProgressProvider store={store}>
        <MemoryRouter>
          <Suspense fallback={<p>Loading</p>}>
            <ProgressPage />
          </Suspense>
        </MemoryRouter>
      </ProgressProvider>,
    );
  });
  return store;
}

const mock = (id: string, scaled: number, submittedAt: string) =>
  ({
    id,
    startedAt: submittedAt,
    submittedAt,
    timedOut: false,
    caseId: 'CS1',
    sections: [],
    answers: {},
    seeds: {},
    marked: [],
    score: { marks: 0, total: 50, scaled, passed: scaled >= 700, byDomain: {} },
    xp: 0,
  }) as unknown as MockRecord;

describe('ProgressPage', () => {
  it('says there is not enough to go on before any practice', async () => {
    await renderWith(() => {});
    expect(await screen.findByText('Not enough to go on yet.')).toBeInTheDocument();
    expect(screen.getByText(/questions answered at least once/)).toBeInTheDocument();
  });

  it('shows readiness, mastery, weakest subtopics and the mock trend', async () => {
    await renderWith((s) => {
      // Storage modes: three misses (weak). Gateways: three right.
      for (const id of ['PRE-001', 'PRE-002', 'PRE-003'])
        s.recordAnswer(id, { earned: 0, possible: 1 }, 'practice');
      for (const id of bank.questions
        .filter((q) => q.subtopic === 'Gateways')
        .slice(0, 3)
        .map((q) => q.id)) {
        s.recordAnswer(id, { earned: 1, possible: 1 }, 'practice');
      }
      // Two mocks, via the store's own document (no questions needed for the trend).
      const doc = s.getSnapshot();
      (s as unknown as { commit: (d: unknown) => void }).commit({
        ...doc,
        mocks: [mock('a', 640, '2026-10-01T10:00:00Z'), mock('b', 760, '2026-10-10T10:00:00Z')],
      });
    });

    const ready = await screen.findByRole('region', { name: 'Readiness estimate' });
    expect(within(ready).getByText('out of 1,000')).toBeInTheDocument();
    expect(within(ready).getByText(/From mocks:/)).toHaveTextContent('712'); // (760×3 + 640×2) / 5;

    const weakest = screen.getByRole('region', { name: 'Weakest subtopics' });
    const rows = within(weakest).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Storage modes');
    expect(rows[0]).toHaveTextContent('0%');
    expect(within(rows[0]!).getByRole('link', { name: 'Practise Storage modes' })).toHaveAttribute(
      'href',
      expect.stringContaining('subtopic=Storage%20modes'),
    );

    expect(
      screen.getByRole('img', { name: /Prepare the data: 50% recent accuracy, 6 of 135/ }),
    ).toBeInTheDocument();

    const trend = screen.getByRole('region', { name: 'Mock scores' });
    fireEvent.click(within(trend).getByText('Show as a table'));
    expect(within(trend).getAllByRole('row')).toHaveLength(3); // header + 2 mocks
    // Keyboard: focusing the chart selects the latest mock and announces it.
    const plot = within(trend).getByRole('group', { name: /Mock scores over time/ });
    act(() => plot.focus());
    expect(within(trend).getByText(/760, pass\./)).toBeInTheDocument();
    fireEvent.keyDown(plot, { key: 'ArrowLeft' });
    expect(within(trend).getByText(/640, below the pass mark\./)).toBeInTheDocument();
  });
});
