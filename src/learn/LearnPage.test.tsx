import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { Suspense } from 'react';
import { MemoryRouter } from 'react-router';
import { ProgressProvider } from '@/progress/ProgressProvider';
import { ProgressStore } from '@/progress/store';
import { memoryStorage } from '@/storage/db';
import { LearnPage } from './LearnPage';

const NOW = () => new Date('2026-10-14T09:00:00');

async function renderLearn(seed?: (s: ProgressStore) => void) {
  const store = await ProgressStore.open(memoryStorage(), NOW);
  seed?.(store);
  await act(async () => {
    render(
      <ProgressProvider store={store}>
        <MemoryRouter>
          <Suspense fallback={<p>Loading</p>}>
            <LearnPage />
          </Suspense>
        </MemoryRouter>
      </ProgressProvider>,
    );
  });
  return store;
}

describe('LearnPage', () => {
  it('greets a first visit with the first lesson and no zeros', async () => {
    await renderLearn();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Start with Storage modes' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start lesson' })).toHaveAttribute(
      'href',
      '/learn/prepare-1',
    );
    const strip = screen.getByRole('region', { name: 'Your progress' });
    expect(strip).toHaveTextContent('Start a streak today');
    expect(strip).not.toHaveTextContent(/\b0 XP\b|0 day/);
    // Quests for a newcomer: the first domain, a lesson, a question count. Each a link.
    const quests = screen.getByRole('region', { name: 'Today’s quests' });
    expect(
      within(quests)
        .getAllByRole('link')
        .map((l) => l.getAttribute('href')),
    ).toEqual([
      '/practice/run?mode=custom&domain=prepare&n=10',
      '/learn/prepare-1',
      '/practice/run?mode=custom&n=15',
    ]);
  });

  it('switches domains like tabs, by click and by arrow keys', async () => {
    await renderLearn();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.getAttribute('aria-label'))).toEqual([
      'Prepare the data, 0 of 15 lessons done',
      expect.stringMatching(/^Model the data, 0 of \d+ lessons done$/),
      expect.stringMatching(/^Visualize and analyze the data, 0 of \d+ lessons done$/),
      expect.stringMatching(/^Manage and secure Power BI, 0 of \d+ lessons done$/),
      expect.stringMatching(/^Case studies, 0 of \d+ lessons done$/),
    ]);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByRole('heading', { name: 'Prepare the data' })).toBeInTheDocument();

    fireEvent.click(tabs[2]!);
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    expect(
      within(screen.getByRole('tabpanel')).getByRole('heading', {
        name: 'Visualize and analyze the data',
      }),
    ).toBeInTheDocument();

    fireEvent.keyDown(tabs[2]!, { key: 'ArrowDown' });
    expect(tabs[3]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[3]).toHaveFocus();
    fireEvent.keyDown(tabs[3]!, { key: 'Home' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    // Roving tab stop: only the selected tab is in the tab order.
    expect(tabs.filter((t) => t.tabIndex === 0)).toEqual([tabs[0]]);
  });

  it('marks finished lessons as applied and moves the next one on', async () => {
    await renderLearn((s) =>
      s.finishLesson('prepare-1', [], { completed: true, accuracy: 1, xp: 90 }),
    );
    expect(screen.getByRole('heading', { level: 2, name: /^Next: / })).toHaveTextContent(
      /Next: Gateways/,
    );
    expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute(
      'href',
      '/learn/prepare-2',
    );
    // 90 for the lesson, and the lesson quest pays 20 as soon as today's quests are planned.
    expect(screen.getByRole('region', { name: 'Your progress' })).toHaveTextContent(
      /1-day streak.*110 XP/,
    );
    const quests = screen.getByRole('region', { name: 'Today’s quests' });
    const finished = within(quests).getByText('Finish a lesson').closest('li')!;
    expect(finished).toHaveAttribute('data-done');
    expect(finished).toHaveTextContent('Done, +20 XP');
    const steps = within(screen.getByRole('tabpanel')).getAllByRole('listitem');
    expect(steps[0]).toHaveAttribute('data-state', 'done');
    expect(steps[1]).toHaveAttribute('data-state', 'current');
    expect(steps[2]).toHaveAttribute('data-state', 'locked');
  });
});
