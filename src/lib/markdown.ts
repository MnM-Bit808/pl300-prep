/**
 * A small Markdown subset for notes, parsed to a tree that the UI renders as React elements.
 * Nothing is ever turned into HTML strings, so a note can't inject markup or script.
 *
 * Blocks: paragraphs (single newlines kept as line breaks), # / ## / ### headings, "- " or
 * "* " bullet lists, "1. " numbered lists, "> " quotes, ``` fenced code.
 * Inline: `code`, **bold**, *italic* or _italic_, [text](https://…) links (http, https and
 * mailto only; anything else stays as plain text).
 */
export type Inline =
  | { t: 'text'; v: string }
  | { t: 'br' }
  | { t: 'code'; v: string }
  | { t: 'strong'; c: Inline[] }
  | { t: 'em'; c: Inline[] }
  | { t: 'link'; href: string; c: Inline[] };

export type Block =
  | { type: 'p'; c: Inline[] }
  | { type: 'h'; level: 1 | 2 | 3; c: Inline[] }
  | { type: 'ul' | 'ol'; items: Inline[][] }
  | { type: 'quote'; c: Inline[] }
  | { type: 'code'; text: string };

const INLINE =
  /(`[^`\n]+`)|\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*([^*\n]+?)\*\*|\*([^*\n]+?)\*|(?<![\w])_([^_\n]+?)_(?![\w])/;
const SAFE_LINK = /^(https?:\/\/|mailto:)/i;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const pushText = (s: string) => {
    s.split('\n').forEach((line, i) => {
      if (i > 0) out.push({ t: 'br' });
      if (line) out.push({ t: 'text', v: line });
    });
  };
  let rest = text;
  while (rest) {
    const m = INLINE.exec(rest);
    if (!m) {
      pushText(rest);
      break;
    }
    if (m.index > 0) pushText(rest.slice(0, m.index));
    const [whole, code, linkText, href, strong, em1, em2] = m;
    if (code) out.push({ t: 'code', v: code.slice(1, -1) });
    else if (linkText !== undefined && href !== undefined) {
      if (SAFE_LINK.test(href)) out.push({ t: 'link', href, c: parseInline(linkText) });
      else pushText(whole);
    } else if (strong !== undefined) out.push({ t: 'strong', c: parseInline(strong) });
    else out.push({ t: 'em', c: parseInline((em1 ?? em2)!) });
    rest = rest.slice(m.index + whole.length);
  }
  return out;
}

const BULLET = /^\s*[-*]\s+(.*)$/;
const NUMBER = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^(#{1,3})\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;

export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ type: 'p', c: parseInline(para.join('\n')) });
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trim().startsWith('```')) {
      flush();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.trim().startsWith('```')) code.push(lines[i++]!);
      blocks.push({ type: 'code', text: code.join('\n') });
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    const h = HEADING.exec(line);
    if (h) {
      flush();
      blocks.push({ type: 'h', level: h[1]!.length as 1 | 2 | 3, c: parseInline(h[2]!) });
      continue;
    }
    const listMatch = BULLET.exec(line) ?? NUMBER.exec(line);
    if (listMatch) {
      flush();
      const type = BULLET.test(line) ? 'ul' : 'ol';
      const re = type === 'ul' ? BULLET : NUMBER;
      const items: Inline[][] = [];
      while (i < lines.length && re.test(lines[i]!))
        items.push(parseInline(re.exec(lines[i++]!)![1]!));
      i--;
      blocks.push({ type, items });
      continue;
    }
    const q = QUOTE.exec(line);
    if (q) {
      flush();
      const quote: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i]!)) quote.push(QUOTE.exec(lines[i++]!)![1]!);
      i--;
      blocks.push({ type: 'quote', c: parseInline(quote.join('\n')) });
      continue;
    }
    para.push(line);
  }
  flush();
  return blocks;
}

/** The note as plain text (for previews and search), Markdown marks removed. */
export function plainText(src: string): string {
  const walk = (c: Inline[]): string =>
    c
      .map((n) => (n.t === 'text' || n.t === 'code' ? n.v : n.t === 'br' ? ' ' : walk(n.c)))
      .join('');
  const blockText = (b: Block): string => {
    if (b.type === 'code') return b.text;
    if ('items' in b) return b.items.map(walk).join(' ');
    return walk(b.c);
  };
  return parseMarkdown(src).map(blockText).join(' ').replace(/\s+/g, ' ').trim();
}
