import { act, fireEvent, render, screen, within } from '@testing-library/react';
import rawBank from '../../pl300-bank/questions/all_questions.json';
import { buildBank } from '@/bank/load';
import { QuestionCard } from './QuestionCard';

const bank = buildBank(rawBank);
const q = (id: string) => {
  const found = bank.questionById.get(id);
  if (!found) throw new Error(`missing ${id}`);
  return found;
};

const checkButton = () => screen.getByRole('button', { name: 'Check' });
const optionByText = (text: string) =>
  [...screen.queryAllByRole('radio'), ...screen.queryAllByRole('checkbox')].find((i) =>
    i.closest('label')?.textContent?.includes(text),
  )!;

describe('QuestionCard', () => {
  it('single: needs an answer, then marks the choice and shows the takeaway', () => {
    render(<QuestionCard question={q('PRE-001')} />);
    fireEvent.click(checkButton());
    expect(screen.getByRole('status')).toHaveTextContent('Not finished: choose an answer.');

    fireEvent.click(optionByText('DirectQuery'));
    fireEvent.click(checkButton());

    expect(screen.getByRole('heading', { name: 'Not quite' })).toBeInTheDocument();
    expect(screen.getByText('Correct answer')).toBeInTheDocument();
    expect(screen.getByText('Your answer, incorrect')).toBeInTheDocument();
    expect(screen.getByText(/Fast visuals \+ periodic freshness/)).toBeInTheDocument();
    for (const input of screen.getAllByRole('radio')) expect(input).toBeDisabled();
  });

  it('single: letter keys pick by screen position', () => {
    render(<QuestionCard question={q('PRE-001')} />);
    fireEvent.keyDown(document.body, { key: 'c' });
    const third = screen.getAllByRole('radio')[2]!;
    expect(third).toBeChecked();
  });

  it('multi: stops at selectCount and scores per pick', () => {
    render(<QuestionCard question={q('PRE-016')} />); // answer: Web + SharePoint folder
    fireEvent.click(optionByText('Web'));
    fireEvent.click(optionByText('Excel workbook'));
    fireEvent.click(optionByText('Folder'));
    expect(optionByText('Folder')).not.toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent("You've chosen 2");

    fireEvent.click(checkButton());
    expect(screen.getByRole('heading', { name: 'Partly correct: 1 of 2' })).toBeInTheDocument();
  });

  it('yesno: scores each statement', () => {
    render(<QuestionCard question={q('PRE-007')} />); // Yes, No, Yes
    const groups = screen.getAllByRole('radiogroup');
    groups.forEach((g) => fireEvent.click(within(g).getByLabelText('Yes')));
    fireEvent.click(checkButton());
    expect(screen.getByRole('heading', { name: 'Partly correct: 2 of 3' })).toBeInTheDocument();
    expect(screen.getByText('Incorrect. The answer is No')).toBeInTheDocument();
  });

  it('dropdown: scores each part', () => {
    render(<QuestionCard question={q('PRE-014')} />); // Web, Basic
    fireEvent.change(screen.getByLabelText('Connector'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Authentication'), { target: { value: '0' } });
    fireEvent.click(checkButton());
    expect(screen.getByRole('heading', { name: 'Partly correct: 1 of 2' })).toBeInTheDocument();
    expect(screen.getByText('Incorrect. The answer is Basic')).toBeInTheDocument();
  });

  it('order: builds, reorders and removes steps, then needs the exact sequence', () => {
    render(<QuestionCard question={q('PRE-012')} />);
    const add = (text: string) =>
      fireEvent.click(
        screen
          .getAllByRole('button')
          .find((b) => b.textContent?.startsWith(text) && b.textContent.includes('add to answer'))!,
      );

    add('Sign in and register');
    add('Install the on-premises');
    add('Publish the report');
    fireEvent.click(screen.getByRole('button', { name: 'Move step 2 up' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove step 3' }));
    add('In the Power BI service');
    add("In the semantic model's settings");

    const steps = within(screen.getByRole('region', { name: 'Answer area' })).getAllByRole(
      'listitem',
    );
    // Each step starts with its slot number; compare the step text after it.
    expect(steps.map((s) => s.textContent?.replace(/^\d+/, '').slice(0, 12))).toEqual([
      'Install the ',
      'Sign in and ',
      'In the Power',
      'In the seman',
    ]);

    fireEvent.click(checkButton());
    expect(screen.getByRole('heading', { name: 'Correct' })).toBeInTheDocument();
  });

  it('order: taps that land before a re-render are all kept', () => {
    render(<QuestionCard question={q('PRE-012')} />);
    const pool = within(screen.getByRole('region', { name: 'Actions' })).getAllByRole('button');
    // Three taps in one React batch, as a fast double tap or quick adds produce.
    act(() => {
      pool.slice(0, 3).forEach((b) => b.click());
    });
    const steps = within(screen.getByRole('region', { name: 'Answer area' })).getAllByRole(
      'listitem',
    );
    expect(steps).toHaveLength(3);
  });

  it('multi: two taps in one batch both count', () => {
    render(<QuestionCard question={q('PRE-016')} />);
    act(() => {
      optionByText('Web').click();
      optionByText('Folder').click();
    });
    expect(screen.getByText('2 of 2 chosen')).toBeInTheDocument();
  });

  it('try again resets the attempt', () => {
    render(<QuestionCard question={q('PRE-001')} />);
    fireEvent.click(optionByText('Import'));
    fireEvent.click(checkButton());
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    });
    expect(screen.getAllByRole('radio').some((r) => (r as HTMLInputElement).checked)).toBe(false);
    expect(checkButton()).toHaveAttribute('aria-disabled', 'true');
  });
});
