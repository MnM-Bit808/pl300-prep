/**
 * "Report a problem" with a question. Reports stay on this device; export them from My
 * workings to send them in. Native modal <dialog>: focus trap and Esc for free.
 */
import { useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { REPORT_KIND_LABEL, REPORT_KINDS, type ReportKind } from './store';
import styles from './ReportDialog.module.css';

interface Props {
  questionId: string;
  onSubmit: (kind: ReportKind, details: string) => void;
  onClose: () => void;
}

export function ReportDialog({ questionId, onSubmit, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState<ReportKind | null>(null);
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');

  useLayoutEffect(() => {
    const d = ref.current;
    if (!d) return;
    d.showModal();
    return () => d.close();
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!kind) return setError('Choose what’s wrong.');
    if (kind === 'other' && !details.trim()) return setError('Say a few words about the problem.');
    onSubmit(kind, details.trim());
  };

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="report-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <form onSubmit={submit} className={styles.form} noValidate>
        <h2 id="report-title" className={styles.title}>
          Report a problem with {questionId}
        </h2>
        <fieldset className={styles.kinds} aria-describedby={error ? 'report-error' : undefined}>
          <legend>What’s wrong?</legend>
          {REPORT_KINDS.map((k) => (
            <label key={k} className={styles.kind} data-choice>
              <input
                type="radio"
                name="kind"
                value={k}
                checked={kind === k}
                onChange={() => {
                  setKind(k);
                  setError('');
                }}
              />
              {REPORT_KIND_LABEL[k]}
            </label>
          ))}
        </fieldset>
        <label className={styles.details}>
          Details {kind === 'other' ? '' : '(optional)'}
          <textarea
            rows={4}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="What did you expect, and what did you see?"
          />
        </label>
        {error && (
          <p id="report-error" className={styles.error} role="alert">
            {error}
          </p>
        )}
        <p className={styles.note}>
          Saved on this device. Export your reports from My workings to send them in.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={styles.submit}>
            Save report
          </button>
        </div>
      </form>
    </dialog>
  );
}
