import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { Suspense, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import rawBank from '../../pl300-bank/questions/all_questions.json';
import { buildBank } from '@/bank/build';
import type { QuestionOf } from '@/bank/schema';
import { ProgressProvider } from '@/progress/ProgressProvider';
import { ProgressStore } from '@/progress/store';
import { QuestionCard } from '@/questions/QuestionCard';
import { SettingsPage } from '@/settings/SettingsPage';
import { memoryStorage } from '@/storage/db';
import { WorkingsPage } from './WorkingsPage';
import { WorkingsStore } from './store';

const bank = buildBank(rawBank);
const pre1 = bank.questionById.get('PRE-001') as QuestionOf<'single'>;

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});

async function renderWith(ui: ReactNode, seed?: (p: ProgressStore, w: WorkingsStore) => void) {
  const progress = await ProgressStore.open(memoryStorage());
  const workings = WorkingsStore.inMemory();
  seed?.(progress, workings);
  await act(async () => {
    render(
      <ProgressProvider store={progress} workings={workings}>
        <MemoryRouter>
          <Suspense fallback={<p>Loading</p>}>{ui}</Suspense>
        </MemoryRouter>
      </ProgressProvider>,
    );
  });
  return { progress, workings };
}

const wait = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)));

describe('question tools', () => {
  it('flag, note and report appear after checking and are saved', async () => {
    const { workings } = await renderWith(<QuestionCard question={pre1} />);
    expect(screen.queryByRole('button', { name: 'Flag' })).toBeNull(); // not before answering

    fireEvent.click(screen.getAllByRole('radio')[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    fireEvent.click(screen.getByRole('button', { name: 'Flag' }));
    expect(screen.getByRole('button', { name: 'Flagged' })).toHaveAttribute('aria-pressed', 'true');
    expect(workings.getSnapshot().flags).toHaveProperty('PRE-001');

    fireEvent.click(screen.getByRole('button', { name: 'Add a note' }));
    fireEvent.change(screen.getByLabelText('Note on PRE-001'), {
      target: { value: '**Import** = fastest' },
    });
    expect(screen.getByText('Saving…')).toBeInTheDocument();
    await wait(600);
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(workings.getSnapshot().questionNotes['PRE-001']?.text).toBe('**Import** = fastest');

    // Preview renders the Markdown.
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    const preview = screen.getByLabelText('Note on PRE-001, preview');
    expect(within(preview).getByText('Import').tagName).toBe('STRONG');

    fireEvent.click(screen.getByRole('button', { name: 'Report a problem' }));
    const dialog = screen.getByRole('dialog', { name: 'Report a problem with PRE-001' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save report' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Choose what’s wrong.');
    fireEvent.click(within(dialog).getByLabelText('The wording is unclear'));
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Which model?' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save report' }));
    expect(workings.getSnapshot().reports).toMatchObject([
      { questionId: 'PRE-001', kind: 'unclear', details: 'Which model?' },
    ]);
  });
});

describe('My workings page', () => {
  const seed = (_p: ProgressStore, w: WorkingsStore) => {
    w.setQuestionNote('PRE-001', 'Import for **speed**');
    w.setQuestionNote('MOD-040', 'CALCULATE changes filter context');
    w.setTopicNote('Get or connect to data', 'Gateways!');
    w.toggleFlag('PRE-002');
    w.addReport({ questionId: 'PRE-003', kind: 'image', details: 'Blurry' });
  };

  it('lists notes, filters by search, and deletes with confirmation', async () => {
    const { workings } = await renderWith(<WorkingsPage />, seed);
    const tabs = screen.getByRole('group', { name: 'Show' });
    expect(within(tabs).getByRole('button', { name: 'Notes 2' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(tabs).getByRole('button', { name: 'Topic notes 1' })).toBeInTheDocument();
    expect(within(tabs).getByRole('button', { name: 'Flagged 1' })).toBeInTheDocument();
    expect(within(tabs).getByRole('button', { name: 'Reports 1' })).toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search your workings' }), {
      target: { value: 'filter context' },
    });
    expect(screen.getByText('MOD-040')).toBeInTheDocument();
    expect(screen.queryByText('PRE-001')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Delete note' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(workings.getSnapshot().questionNotes).not.toHaveProperty('MOD-040');
  });

  it('shows flagged questions with a practice run, and reports', async () => {
    await renderWith(<WorkingsPage />, seed);
    fireEvent.click(screen.getByRole('button', { name: /Flagged/ }));
    expect(screen.getByRole('link', { name: 'Practise flagged questions' })).toHaveAttribute(
      'href',
      '/practice/run?mode=flagged',
    );
    expect(screen.getByText('PRE-002')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Reports/ }));
    expect(screen.getByText('The exhibit has a problem')).toBeInTheDocument();
    expect(screen.getByText('Blurry')).toBeInTheDocument();
  });
});

describe('Settings', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-text-size');
    localStorage.clear();
  });

  it('applies theme and text size straight away', async () => {
    await renderWith(<SettingsPage />);
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    fireEvent.click(screen.getByRole('radio', { name: 'Larger' }));
    expect(document.documentElement).toHaveAttribute('data-text-size', 'larger');
    fireEvent.click(screen.getByRole('radio', { name: 'Default' }));
    expect(document.documentElement).not.toHaveAttribute('data-text-size');
  });

  it('resets progress but keeps notes, unless asked to delete them too', async () => {
    const seed = (p: ProgressStore, w: WorkingsStore) => {
      p.recordAnswer('PRE-001', { earned: 1, possible: 1 }, 'lesson');
      w.setQuestionNote('PRE-001', 'keep me');
    };
    const a = await renderWith(<SettingsPage />, seed);
    fireEvent.click(screen.getByRole('button', { name: 'Reset progress' }));
    await act(async () => {
      fireEvent.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Reset progress' }),
      );
    });
    expect(a.progress.getSnapshot().questions).toEqual({});
    expect(a.workings.getSnapshot().questionNotes).toHaveProperty('PRE-001');
    expect(screen.getByText(/Your notes, flags and reports are kept/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reset progress' }));
    fireEvent.click(screen.getByLabelText('Also delete my notes, flags and reports'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Delete everything' }));
    });
    expect(a.workings.getSnapshot().questionNotes).toEqual({});
  });

  it('checks a backup before restoring, and explains a bad file', async () => {
    await renderWith(<SettingsPage />);
    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    const pick = async (text: string) => {
      const file = new File([text], 'backup.json', { type: 'application/json' });
      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
        await new Promise((r) => setTimeout(r, 0));
      });
    };
    await pick('{"nope":true}');
    expect(screen.getByRole('alert')).toHaveTextContent('This isn’t a PL-300 Prep backup file.');

    const store = await ProgressStore.open(memoryStorage());
    store.recordAnswer('PRE-001', { earned: 1, possible: 1 }, 'lesson');
    const backup = {
      app: 'pl300-prep',
      kind: 'backup',
      version: 1,
      exportedAt: '2026-10-15T09:00:00Z',
      progress: store.getSnapshot(),
      attempts: [
        {
          questionId: 'PRE-001',
          at: '2026-10-15T09:00:00Z',
          earned: 1,
          possible: 1,
          mode: 'lesson',
        },
      ],
      workings: WorkingsStore.inMemory().getSnapshot(),
      mockDraft: null,
      settings: {},
    };
    await pick(JSON.stringify(backup));
    const dialog = screen.getByRole('dialog', { name: 'Replace everything with this backup?' });
    expect(dialog).toHaveTextContent('1 questions answered (1 answers)');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep what I have' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
