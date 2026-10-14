import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { Suspense } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import rawBank from '../../pl300-bank/questions/all_questions.json';
import { buildBank } from '@/bank/load';
import { ProgressProvider } from '@/progress/ProgressProvider';
import { ProgressStore } from '@/progress/store';
import { QuestionCard } from '@/questions/QuestionCard';
import { memoryStorage } from '@/storage/db';
import { AppendSim } from './append/AppendSim';
import { ConceptPage } from './ConceptPage';
import { DaxSim } from './dax/DaxSim';
import { JoinSim } from './joins/JoinSim';
import { SchemaSim } from './schema/SchemaSim';

const bank = buildBank(rawBank);
const inRouter = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);
const status = () =>
  screen
    .getAllByRole('status')
    .map((s) => s.textContent)
    .join(' | ');

describe('Join kinds simulator', () => {
  it('recomputes as the join kind and the keys change', () => {
    inRouter(<JoinSim />);
    expect(status()).toContain('Left outer join: 4 rows: 3 matched, 1 from Orders only');
    expect(screen.getByText(/Rows can multiply/).closest('p')).toHaveTextContent('Fabrikam');

    fireEvent.click(screen.getByRole('radio', { name: /Right anti/ }));
    expect(status()).toContain('Right anti join: 1 row: 1 from Customers only');
    expect(screen.getByText(/Anti joins find what’s missing/)).toBeInTheDocument();

    // Point O4 at Northwind: now every customer has an order, and the anti join is empty.
    fireEvent.change(screen.getByLabelText('CustomerID for O4'), { target: { value: 'C3' } });
    expect(status()).toContain('Right anti join: 0 rows');
  });

  it('marks every input row as kept or left out, in words', () => {
    inRouter(<JoinSim />);
    fireEvent.click(screen.getByRole('radio', { name: /Inner/ }));
    const orders = screen.getByRole('table', { name: /Orders/ });
    const o4 = within(orders)
      .getAllByRole('row')
      .find((r) => r.textContent?.includes('O4'))!;
    expect(o4).toHaveTextContent('Left out');
  });
});

describe('Append vs Merge simulator', () => {
  it('shows the shape change and the column-name trap', () => {
    inRouter(<AppendSim />);
    expect(status()).toContain('Result: 5 rows × 5 columns');
    expect(screen.getByText(/Append matches columns by name/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/First rename Feb’s/));
    expect(status()).toContain('Result: 5 rows × 4 columns');

    fireEvent.click(screen.getByRole('radio', { name: 'Merge Regions into Jan' }));
    expect(status()).toContain('Result: 3 rows × 4 columns');
    expect(screen.getByText('No match')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Join kinds simulator' })).toHaveAttribute(
      'href',
      '/concepts/join-kinds',
    );
  });
});

describe('Filter context simulator', () => {
  it('inspects a cell: its filters and the rows it counts', () => {
    inRouter(<DaxSim />);
    expect(screen.getByRole('heading', { name: 'Red, 2025: 500' })).toBeInTheDocument();
    expect(screen.getByText('400 + 60 + 40 = 500')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Blue, Total: 100' }));
    expect(screen.getByRole('heading', { name: 'Blue, all years: 100' })).toBeInTheDocument();
  });

  it('shows CALCULATE replacing a filter, and KEEPFILTERS intersecting', () => {
    inRouter(<DaxSim />);
    fireEvent.click(screen.getByRole('radio', { name: 'Red sales' }));
    fireEvent.click(screen.getByRole('button', { name: 'Blue, Total: 1,080' }));
    expect(screen.getByText('Color: Red')).toHaveTextContent('changed');

    fireEvent.click(screen.getByRole('radio', { name: 'Red sales (KEEPFILTERS)' }));
    expect(screen.getByRole('button', { name: 'Blue, Total: blank' })).toBeInTheDocument();
    expect(screen.getByText('No rows: the result is blank.')).toBeInTheDocument();
  });

  it('the slicer removes a year column and filters every cell', () => {
    inRouter(<DaxSim />);
    fireEvent.click(screen.getByRole('button', { name: '2025' }));
    expect(screen.queryByRole('columnheader', { name: '2026' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Total, Total: 620' })).toBeInTheDocument();
  });

  it('context transition: SUM alone vs CALCULATE in a calculated column', () => {
    inRouter(<DaxSim />);
    fireEvent.click(screen.getByRole('radio', { name: 'Calculated columns' }));
    expect(screen.getByRole('button', { name: 'Bike: 1,380' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Sales with CALCULATE' }));
    expect(screen.getByRole('button', { name: 'Bike: 900' })).toBeInTheDocument();
  });
});

describe('Star vs snowflake simulator', () => {
  it('follows a filter to the fact table, and flattens the snowflake', () => {
    inRouter(<SchemaSim />);
    expect(status()).toContain('Category = Bikes filters Category, then reaches Sales in 3 hops');
    expect(
      screen.getByRole('img', { name: /^Snowflake schema \d+ tables\. A filter on Category/ }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: 'Year' }));
    expect(status()).toContain('reaches Sales in 1 hop');

    fireEvent.click(screen.getByRole('radio', { name: 'Category' }));
    fireEvent.click(screen.getByRole('button', { name: 'Flatten into a star' }));
    expect(status()).toContain('filters Product, then reaches Sales in 1 hop');
    // The button is gone, so focus moves to the steps it produced instead of dropping to the page.
    expect(
      screen.getByRole('region', { name: 'Flattened with three Power Query steps' }),
    ).toHaveFocus();
  });
});

describe('See it working link', () => {
  const answer = (id: string) => {
    const question = bank.questionById.get(id)!;
    inRouter(<QuestionCard question={question} />);
    fireEvent.click(screen.getAllByRole('radio')[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
  };

  it('appears after answering a question the simulators cover', () => {
    answer('PRE-088'); // Merge queries
    expect(screen.getByRole('link', { name: 'Join kinds simulator' })).toHaveAttribute(
      'href',
      '/concepts/join-kinds',
    );
  });

  it('stays away from subtopics without a simulator', () => {
    answer('PRE-001'); // Storage modes
    expect(screen.queryByText('See it working:')).toBeNull();
  });
});

describe('Concept page', () => {
  it('loads the simulator on demand and links to practice', async () => {
    const store = await ProgressStore.open(memoryStorage());
    await act(async () => {
      render(
        <ProgressProvider store={store}>
          <MemoryRouter initialEntries={['/concepts/join-kinds']}>
            <Suspense fallback={<p>Loading</p>}>
              <Routes>
                <Route path="/concepts/:id" element={<ConceptPage />} />
              </Routes>
            </Suspense>
          </MemoryRouter>
        </ProgressProvider>,
      );
    });
    expect(await screen.findByRole('radio', { name: /Left outer/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Practise merge queries/ })).toHaveAttribute(
      'href',
      expect.stringContaining('subtopic=Merge%20queries'),
    );
  });
});
