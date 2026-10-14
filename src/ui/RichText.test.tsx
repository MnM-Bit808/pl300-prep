import { render } from '@testing-library/react';
import { RichText } from './RichText';

describe('RichText', () => {
  it('splits paragraphs, keeps line breaks and renders backtick code', () => {
    const { container } = render(
      <RichText text={'Measure:\n`Total = SUM ( Sales[Amount] )`\n\nWhich <b>result</b>?'} />,
    );
    const ps = container.querySelectorAll('p');
    expect(ps).toHaveLength(2);
    expect(ps[0]!.querySelector('br')).not.toBeNull();
    expect(ps[0]!.querySelector('code')).toHaveTextContent('Total = SUM ( Sales[Amount] )');
    // Bank text is never parsed as HTML.
    expect(ps[1]!.querySelector('b')).toBeNull();
    expect(ps[1]).toHaveTextContent('Which <b>result</b>?');
  });
});
