/**
 * Service worker news, as a small note above the tab bar: "ready to work offline" once, and "a new
 * version is ready" when one is waiting. It lives in the site frame only, so it never appears
 * during a lesson, a practice run or a mock exam.
 */
import { useState } from 'react';
import { reloadToUpdate, setSwState, useSwState } from './state';
import styles from './UpdatePrompt.module.css';

export function UpdatePrompt() {
  const { needRefresh, offlineReady, offlineNoted } = useSwState();
  const [later, setLater] = useState(false);
  const [reloading, setReloading] = useState(false);

  let note = null;
  if (needRefresh && !later) {
    note = (
      <>
        <p className={styles.text}>A new version of PL-300 Prep is ready.</p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primary}
            disabled={reloading}
            onClick={() => {
              setReloading(true);
              void reloadToUpdate();
            }}
          >
            {reloading ? 'Reloading…' : 'Reload'}
          </button>
          <button type="button" className={styles.quiet} onClick={() => setLater(true)}>
            Later
          </button>
        </div>
      </>
    );
  } else if (offlineReady && !offlineNoted) {
    note = (
      <>
        <p className={styles.text}>
          Ready to work offline: lessons, practice and mock exams now work with no connection.
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.quiet}
            onClick={() => setSwState({ offlineNoted: true })}
          >
            OK
          </button>
        </div>
      </>
    );
  }

  // The live region is always present, so screen readers announce the note when it appears.
  return (
    <div className={styles.region} role="status" aria-live="polite">
      {note && <div className={styles.note}>{note}</div>}
    </div>
  );
}
