/**
 * A note: write in plain text or Markdown, preview it, and it saves itself (a short pause after
 * typing, and on leaving the box). The save state is announced, so you never wonder.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { Markdown } from '@/ui/Markdown';
import styles from './NoteEditor.module.css';

const SAVE_AFTER_MS = 500;

interface Props {
  label: string;
  value: string;
  onSave: (text: string) => void;
  /** Focus the box when it opens. */
  autoFocus?: boolean;
}

export function NoteEditor({ label, value, onSave, autoFocus = false }: Props) {
  const id = useId();
  const [text, setText] = useState(value);
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [status, setStatus] = useState<'saved' | 'unsaved' | 'idle'>('idle');
  const timer = useRef<number | undefined>(undefined);
  // The text as typed, readable from timers and cleanup without waiting for a render.
  const latest = useRef(value);
  const saved = useRef(value);

  const save = () => {
    window.clearTimeout(timer.current);
    if (latest.current === saved.current) return;
    saved.current = latest.current;
    onSave(latest.current);
    setStatus('saved');
  };
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  // Save anything pending when the editor closes.
  useEffect(() => () => saveRef.current(), []);

  const onChange = (next: string) => {
    latest.current = next;
    setText(next);
    setStatus('unsaved');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => saveRef.current(), SAVE_AFTER_MS);
  };

  return (
    <div className={styles.editor}>
      <div className={styles.head}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        <div className={styles.modes} role="group" aria-label="Note view">
          <button type="button" aria-pressed={mode === 'write'} onClick={() => setMode('write')}>
            Write
          </button>
          <button
            type="button"
            aria-pressed={mode === 'preview'}
            onClick={() => {
              save();
              setMode('preview');
            }}
          >
            Preview
          </button>
        </div>
      </div>
      {mode === 'write' ? (
        <textarea
          id={id}
          className={styles.box}
          value={text}
          rows={Math.min(14, Math.max(4, text.split('\n').length + 1))}
          autoFocus={autoFocus}
          placeholder="Your own words: why the answer is right, a rule of thumb, a DAX pattern…"
          onChange={(e) => onChange(e.target.value)}
          onBlur={save}
        />
      ) : (
        <div id={id} className={styles.preview} tabIndex={0} aria-label={`${label}, preview`}>
          {text.trim() ? (
            <Markdown source={text} />
          ) : (
            <p className={styles.empty}>Nothing written yet.</p>
          )}
        </div>
      )}
      <p className={styles.foot}>
        <span>
          Markdown works: <code>**bold**</code>, <code>*italic*</code>, <code>`DAX`</code>,{' '}
          <code>- lists</code>
        </span>
        <span className={styles.status} role="status" aria-live="polite">
          {status === 'saved' ? 'Saved' : status === 'unsaved' ? 'Saving…' : ''}
        </span>
      </p>
    </div>
  );
}
