/** Renders a note's Markdown subset as React elements (never as HTML strings). */
import { Fragment, useMemo, type ReactNode } from 'react';
import { parseMarkdown, type Inline } from '@/lib/markdown';
import styles from './Markdown.module.css';

function inline(nodes: Inline[]): ReactNode {
  return nodes.map((n, i) => {
    switch (n.t) {
      case 'text':
        return <Fragment key={i}>{n.v}</Fragment>;
      case 'br':
        return <br key={i} />;
      case 'code':
        return (
          <code key={i} className={styles.code}>
            {n.v}
          </code>
        );
      case 'strong':
        return <strong key={i}>{inline(n.c)}</strong>;
      case 'em':
        return <em key={i}>{inline(n.c)}</em>;
      case 'link':
        return (
          <a key={i} href={n.href} target="_blank" rel="noopener noreferrer">
            {inline(n.c)}
          </a>
        );
    }
  });
}

export function Markdown({ source }: { source: string }) {
  const blocks = useMemo(() => parseMarkdown(source), [source]);
  return (
    <div className={styles.md}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'p':
            return <p key={i}>{inline(b.c)}</p>;
          case 'h':
            // Notes sit inside the page's own outline, so their headings are styled text.
            return (
              <p key={i} className={styles.heading} data-level={b.level}>
                {inline(b.c)}
              </p>
            );
          case 'ul':
            return (
              <ul key={i}>
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it)}</li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={i}>
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it)}</li>
                ))}
              </ol>
            );
          case 'quote':
            return <blockquote key={i}>{inline(b.c)}</blockquote>;
          case 'code':
            return (
              <pre key={i} className={styles.pre}>
                <code>{b.text}</code>
              </pre>
            );
        }
      })}
    </div>
  );
}
