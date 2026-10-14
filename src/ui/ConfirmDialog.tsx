/**
 * A small modal confirmation. Native <dialog> for focus trapping and Esc; the safe choice is
 * focused first, so an accidental Enter never destroys anything.
 */
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import styles from './ConfirmDialog.module.css';

interface Props {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Extra content between the message and the buttons (e.g. an option). */
  children?: ReactNode;
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  children,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const d = ref.current;
    if (!d) return;
    d.showModal();
    cancelRef.current?.focus();
    return () => d.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="confirm-title"
      aria-describedby="confirm-body"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <h2 id="confirm-title" className={styles.title}>
        {title}
      </h2>
      <p id="confirm-body" className={styles.body}>
        {body}
      </p>
      {children}
      <div className={styles.actions}>
        <button ref={cancelRef} type="button" className={styles.cancel} onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" className={styles.confirm} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
