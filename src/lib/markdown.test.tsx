import { render } from '@testing-library/react';
import { Markdown } from '@/ui/Markdown';
import { parseInline, parseMarkdown, plainText } from './markdown';

describe('markdown', () => {
  it('parses inline marks', () => {
    expect(parseInline('Use **CALCULATE** with *filters* and `ALL ( T )`')).toEqual([
      { t: 'text', v: 'Use ' },
      { t: 'strong', c: [{ t: 'text', v: 'CALCULATE' }] },
      { t: 'text', v: ' with ' },
      { t: 'em', c: [{ t: 'text', v: 'filters' }] },
      { t: 'text', v: ' and ' },
      { t: 'code', v: 'ALL ( T )' },
    ]);
  });

  it('keeps snake_case words intact and only links safe URLs', () => {
    expect(parseInline('Sales_Amount_Total')).toEqual([{ t: 'text', v: 'Sales_Amount_Total' }]);
    expect(parseInline('[docs](https://learn.microsoft.com)')[0]).toMatchObject({
      t: 'link',
      href: 'https://learn.microsoft.com',
    });
    expect(parseInline('[bad](javascript:alert(1))')).toEqual([
      { t: 'text', v: '[bad](javascript:alert(1)' },
      { t: 'text', v: ')' },
    ]);
  });

  it('parses blocks: headings, lists, quotes, code, paragraphs with line breaks', () => {
    const blocks = parseMarkdown(
      '# Rule\nLine one\nLine two\n\n- a\n- b\n\n1. first\n2. second\n\n> remember\n\n```\nVAR x = 1\n```',
    );
    expect(blocks.map((b) => b.type)).toEqual(['h', 'p', 'ul', 'ol', 'quote', 'code']);
    expect(blocks[1]).toEqual({
      type: 'p',
      c: [{ t: 'text', v: 'Line one' }, { t: 'br' }, { t: 'text', v: 'Line two' }],
    });
    expect(blocks[5]).toEqual({ type: 'code', text: 'VAR x = 1' });
  });

  it('gives plain text for previews and search', () => {
    expect(plainText('**Dual** for *shared* dims\n\n- `Import` facts')).toBe(
      'Dual for shared dims Import facts',
    );
  });

  it('renders elements, never raw HTML', () => {
    const { container } = render(<Markdown source={'<img src=x onerror=alert(1)> **ok**'} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('strong')).toHaveTextContent('ok');
    expect(container).toHaveTextContent('<img src=x onerror=alert(1)>');
  });
});
