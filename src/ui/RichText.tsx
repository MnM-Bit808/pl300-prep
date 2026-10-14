/**
 * Renders bank text: "\n\n" separates paragraphs, "\n" is a line break, and `backticks` mark
 * DAX or M code. Nothing is parsed as HTML, so bank text can never inject markup.
 */
import { Fragment } from 'react';
import styles from './RichText.module.css';

export function InlineText({ text }: { text: string }) {
  // split with a capture group alternates plain text and code: [text, code, text, code, …]
  const pieces = text.split(/`([^`]+)`/);
  return (
    <>
      {pieces.map((piece, i) =>
        i % 2 === 1 ? (
          <code key={i} className={styles.code}>
            {piece}
          </code>
        ) : (
          <Fragment key={i}>
            {piece.split('\n').map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {line}
              </Fragment>
            ))}
          </Fragment>
        ),
      )}
    </>
  );
}

export function RichText({ text, className }: { text: string; className?: string | undefined }) {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim());
  return (
    <div className={className}>
      {paragraphs.map((p, i) => (
        <p key={i} className={styles.paragraph}>
          <InlineText text={p} />
        </p>
      ))}
    </div>
  );
}
