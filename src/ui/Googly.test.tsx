import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Confetti } from './Confetti';
import { Googly } from './Googly';

describe('Googly', () => {
  it('is decoration unless it has a label', () => {
    const { container, rerender } = render(<Googly />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    rerender(<Googly label="PL-300 Prep" />);
    expect(screen.getByRole('img', { name: 'PL-300 Prep' })).toBeInTheDocument();
  });

  it('keeps its pupils inside the eyes, however far it is asked to look', () => {
    const { container } = render(<Googly look={{ x: 3, y: 4 }} />);
    const svg = container.querySelector('svg')!;
    expect(svg.style.getPropertyValue('--lx')).toBe('0.60');
    expect(svg.style.getPropertyValue('--ly')).toBe('0.80');
  });

  it('smiles with its eyes when happy and frowns its brows at oops', () => {
    const paths = (mood: 'idle' | 'happy' | 'oops') =>
      render(<Googly mood={mood} />).container.querySelectorAll('path').length;
    // The 3 and the mouth; happy draws each eye as a cheek, its line and a dome, oops adds brows.
    expect(paths('idle')).toBe(2);
    expect(paths('happy')).toBe(8);
    expect(paths('oops')).toBe(3);
  });
});

describe('Confetti', () => {
  afterEach(() => document.documentElement.removeAttribute('data-motion'));

  it('bursts as decoration', () => {
    const { container } = render(<Confetti from={createRef()} />);
    const layer = container.firstElementChild!;
    expect(layer).toHaveAttribute('aria-hidden', 'true');
    expect(layer.children.length).toBeGreaterThan(20);
  });

  it('draws nothing when motion is reduced', () => {
    document.documentElement.setAttribute('data-motion', 'reduce');
    const { container } = render(<Confetti from={createRef()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
