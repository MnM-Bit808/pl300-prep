import { act, fireEvent, render, screen } from '@testing-library/react';
import rawBank from '../../pl300-bank/questions/all_questions.json';
import { buildBank } from '@/bank/load';
import { QuestionCard } from '@/questions/QuestionCard';
import { CaseFrame } from './CaseFrame';

const bank = buildBank(rawBank);
const cs1 = bank.caseById.get('CS1')!; // Overview | Data sources | Requirements | Exhibit

function setWide(wide: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: wide,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

// jsdom has no <dialog> behaviour; give it just enough.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

describe('CaseFrame', () => {
  it('wide: shows the case beside the question, with keyboard-operable tabs', () => {
    setWide(true);
    render(
      <CaseFrame caseStudy={cs1} position="Question 1 of 7 in this case">
        <p>The question</p>
      </CaseFrame>,
    );
    expect(screen.getByRole('complementary', { name: 'Tailwind Traders' })).toBeInTheDocument();
    expect(screen.getByText('The question')).toBeInTheDocument();

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual([
      'Overview',
      'Data sources',
      'Requirements',
      'Exhibit',
    ]);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('140 home-improvement stores');

    // Arrow keys move and select; Home/End jump; focus follows.
    fireEvent.keyDown(tabs[0]!, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Data sources' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Data sources' }));
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Exhibit' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel').querySelector('img')).toHaveAttribute(
      'alt',
      expect.stringContaining('Draft model'),
    );
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');

    // Only the selected tab is in the tab order.
    expect(screen.getAllByRole('tab').filter((t) => t.tabIndex === 0)).toHaveLength(1);
  });

  it('keeps the answer when the layout crosses the breakpoint', () => {
    let wide = false;
    const listeners = new Set<() => void>();
    window.matchMedia = ((query: string) => ({
      get matches() {
        return wide;
      },
      media: query,
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    })) as unknown as typeof window.matchMedia;

    const question = bank.questionById.get('CASE-001')!;
    render(
      <CaseFrame caseStudy={cs1}>
        <QuestionCard question={question} />
      </CaseFrame>,
    );
    const pick = screen
      .getAllByRole('radio')
      .find((r) => r.closest('label')?.textContent?.includes('on-premises SQL Server only'))!;
    fireEvent.click(pick);
    expect(pick).toBeChecked();

    act(() => {
      wide = true;
      listeners.forEach((fn) => fn());
    });
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(pick).toBeInTheDocument(); // same element: not remounted
    expect(pick).toBeChecked();
  });

  it('narrow: the case opens in a sheet that remembers its tab', () => {
    setWide(false);
    render(
      <CaseFrame caseStudy={cs1}>
        <p>The question</p>
      </CaseFrame>,
    );
    expect(screen.queryByRole('complementary')).toBeNull();
    const open = screen.getByRole('button', { name: 'Read case' });
    expect(open).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(open);
    expect(open).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('tab', { name: 'Requirements', hidden: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to the question', hidden: true }));
    expect(open).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(open);

    fireEvent.click(open);
    expect(screen.getByRole('tab', { name: 'Requirements', hidden: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
