/**
 * Settings (BUILD_PROMPT 4.8): appearance, the app (install, offline), your data (back up,
 * restore, reset) and about.
 * There's no sound setting because the app makes no sound (nor did Paath).
 */
import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import {
  PREFS,
  readPrefs,
  usePref,
  writePrefIfValid,
  type PrefName,
  type PrefValue,
} from '@/app/prefs';
import { useBank } from '@/bank/useBank';
import {
  applyBackup,
  backupFilename,
  downloadJson,
  makeBackup,
  parseBackup,
  type Backup,
  type BackupSummary,
} from '@/data/backup';
import { formatDate } from '@/lib/dates';
import { useAppData, useProgress, useProgressStore } from '@/progress/hooks';
import { GOALS } from '@/progress/xp';
import { ChipGroup } from '@/ui/ChipGroup';
import { promptInstall, useInstallState } from '@/pwa/install';
import { useSwState } from '@/pwa/state';
import { MOCK_DRAFT_KEY, PROGRESS_KEY } from '@/progress/store';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { DownloadIcon, UploadIcon } from '@/ui/icons';
import buttons from '@/ui/buttons.module.css';
import { emptyWorkings, WORKINGS_KEY } from '@/workings/store';
import styles from './SettingsPage.module.css';
import { useDocumentTitle } from '@/app/title';

const LABELS: { [P in PrefName]: Record<PrefValue<P>, string> } = {
  theme: { system: 'Match device', light: 'Light', dark: 'Dark' },
  textSize: { default: 'Default', large: 'Large', larger: 'Larger' },
  motion: { system: 'Match device', reduce: 'Reduce motion' },
};

function Choice<P extends PrefName>({
  name,
  legend,
  hint,
}: {
  name: P;
  legend: string;
  hint?: string;
}) {
  const [value, set] = usePref(name);
  const id = useId();
  return (
    <fieldset className={styles.choice} aria-describedby={hint ? `${id}-hint` : undefined}>
      <legend>{legend}</legend>
      <div className={styles.options}>
        {(PREFS[name].values as readonly PrefValue<P>[]).map((v) => (
          <label
            key={v}
            className={styles.option}
            data-choice
            data-size={name === 'textSize' ? v : undefined}
          >
            <input
              type="radio"
              name={`${id}-${name}`}
              checked={value === v}
              onChange={() => set(v)}
            />
            {LABELS[name][v]}
          </label>
        ))}
      </div>
      {hint && (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
    </fieldset>
  );
}

/** How much XP a day counts as a good day: drives the goal bar on Learn. */
function GoalSection() {
  const doc = useProgress();
  const store = useProgressStore();
  return (
    <section className={styles.card} aria-labelledby="daily-goal">
      <h2 id="daily-goal" className={styles.h2}>
        Daily goal
      </h2>
      <ChipGroup
        legend="XP to earn each day"
        value={String(doc.xp.goal)}
        options={GOALS.map((g) => ({ value: String(g), label: `${g} XP` }))}
        onChange={(v) => store.setGoal(Number(v))}
      />
      <p className={styles.hint}>
        A question right on the first try earns 10 XP, so 50 XP is about five questions. A lesson
        with no mistakes adds 10 more.
      </p>
    </section>
  );
}

/** Installing, and whether it works offline yet. */
function AppSection({ say }: { say: (message: string) => void }) {
  const install = useInstallState();
  const { offlineReady } = useSwState();
  const offline = !import.meta.env.PROD
    ? 'Offline use is off in development builds.'
    : offlineReady
      ? 'Works offline on this device: every lesson, question and exhibit is saved.'
      : 'Getting ready to work offline. It finishes in the background during your first visit.';

  return (
    <section className={styles.card} aria-labelledby="app">
      <h2 id="app" className={styles.h2}>
        App
      </h2>
      <p className={styles.text}>{offline}</p>
      {install === 'installed' && (
        <p className={styles.text}>Installed: you’re using PL-300 Prep as an app.</p>
      )}
      {install === 'available' && (
        <>
          <p className={styles.text}>
            Install it to open it from your home screen or dock, in its own window.
          </p>
          <button
            type="button"
            className={styles.inline}
            onClick={async () =>
              say(
                (await promptInstall())
                  ? 'Installing PL-300 Prep.'
                  : 'Not installed. You can install it from here any time.',
              )
            }
          >
            Install PL-300 Prep
          </button>
        </>
      )}
      {install === 'ios' && (
        <p className={styles.text}>
          To install on iPhone or iPad: in Safari, tap Share, then Add to Home Screen.
        </p>
      )}
      {install === 'manual' && (
        <p className={styles.text}>
          To install, look for Install app or Add to Home screen in your browser’s menu. Not every
          browser offers it.
        </p>
      )}
    </section>
  );
}

export function SettingsPage() {
  useDocumentTitle('Settings');
  const bank = useBank();
  const { storage, progress, workings } = useAppData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('');
  const [importing, setImporting] = useState<null | { backup: Backup; summary: BackupSummary }>(
    null,
  );
  const [importError, setImportError] = useState('');
  const [resetting, setResetting] = useState(false);
  const [alsoWorkings, setAlsoWorkings] = useState(false);
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    let live = true;
    navigator.storage?.persisted?.().then(
      (p) => live && setPersisted(p),
      () => {},
    );
    return () => {
      live = false;
    };
  }, []);

  const exportAll = async () => {
    const backup = makeBackup({
      progress: progress.getSnapshot(),
      attempts: await progress.attempts(),
      workings: workings.getSnapshot(),
      mockDraft: progress.getMockDraft(),
      settings: readPrefs(),
    });
    downloadJson(backupFilename('backup'), backup);
    setStatus('Backup downloaded.');
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // choosing the same file again still fires
    if (!file) return;
    setImportError('');
    const result = parseBackup(await file.text());
    if (result.ok) setImporting({ backup: result.backup, summary: result.summary });
    else setImportError(result.error);
  };

  const confirmImport = async () => {
    if (!importing) return;
    await progress.flush();
    await workings.flush();
    await applyBackup(
      storage,
      importing.backup,
      { progress: PROGRESS_KEY, workings: WORKINGS_KEY, mockDraft: MOCK_DRAFT_KEY },
      writePrefIfValid,
    );
    setStatus('Backup restored. Reloading…');
    window.location.reload();
  };

  const confirmReset = async () => {
    await progress.reset();
    if (alsoWorkings) {
      workings.replace(emptyWorkings());
      await workings.flush();
    }
    setResetting(false);
    setStatus(
      alsoWorkings
        ? 'Progress, notes, flags and reports deleted.'
        : 'Progress reset. Your notes, flags and reports are kept.',
    );
    setAlsoWorkings(false);
  };

  const s = importing?.summary;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Settings</h1>
      {/* One live region: visible when there's something to say. */}
      <p className={status ? styles.toast : 'sr-only'} role="status" aria-live="polite">
        {status}
      </p>

      <section className={styles.card} aria-labelledby="appearance">
        <h2 id="appearance" className={styles.h2}>
          Appearance
        </h2>
        <Choice name="theme" legend="Theme" />
        <Choice
          name="textSize"
          legend="Text size"
          hint="Scales all text in the app, including questions and code."
        />
        <Choice
          name="motion"
          legend="Motion"
          hint="Reduce motion turns off the card flip, highlighter sweep and slide-ins, even if your device allows them."
        />
      </section>

      <GoalSection />

      <AppSection say={setStatus} />

      <section className={styles.card} aria-labelledby="data">
        <h2 id="data" className={styles.h2}>
          Your data
        </h2>
        <p className={styles.text}>
          {storage.persistent
            ? 'Everything is saved in this browser on this device. Nothing is sent anywhere.'
            : 'This browser is blocking storage, so your progress only lasts for this visit. Back up before you leave.'}
          {persisted === false &&
            storage.persistent &&
            ' The browser may clear it if space runs low.'}
        </p>
        {persisted === false && storage.persistent && navigator.storage?.persist && (
          <button
            type="button"
            className={styles.inline}
            onClick={async () => {
              const ok = await navigator.storage.persist();
              setPersisted(ok);
              setStatus(
                ok
                  ? 'The browser will keep your data.'
                  : 'The browser didn’t agree to keep it. Back up from time to time.',
              );
            }}
          >
            Ask the browser to keep it
          </button>
        )}

        <div className={styles.dataActions}>
          <button type="button" className={buttons.primary} onClick={exportAll}>
            <span className={styles.btnInner}>
              <DownloadIcon aria-hidden="true" /> Back up everything
            </span>
          </button>
          <button
            type="button"
            className={buttons.secondary}
            onClick={() => fileRef.current?.click()}
          >
            <span className={styles.btnInner}>
              <UploadIcon aria-hidden="true" /> Restore from a backup
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={onFile}
          />
        </div>
        <p className={styles.hint}>
          One JSON file with your progress, every answer, notes, flags, reports, any exam in
          progress and these settings.
        </p>
        {importError && (
          <p className={styles.error} role="alert">
            {importError}
          </p>
        )}

        <div className={styles.danger}>
          <h3 className={styles.h3}>Start again</h3>
          <p className={styles.text}>
            Clear your XP, streak, lessons, answers, reviews and mock history.
          </p>
          <button type="button" className={styles.dangerBtn} onClick={() => setResetting(true)}>
            Reset progress
          </button>
        </div>
      </section>

      <section className={styles.card} aria-labelledby="about">
        <h2 id="about" className={styles.h2}>
          About
        </h2>
        <p className={styles.text}>
          PL-300 Prep: {bank.questions.length} original practice questions and {bank.cases.length}{' '}
          case studies for the Microsoft PL-300 (Power BI Data Analyst) exam. Not affiliated with or
          endorsed by Microsoft.
        </p>
      </section>

      {importing && s && (
        <ConfirmDialog
          title="Replace everything with this backup?"
          body={`Backup from ${formatDate(s.exportedAt)}: ${s.questionsAnswered} questions answered (${s.attempts} answers), ${s.lessons} lessons, ${s.mocks} mocks, ${s.notes} notes, ${s.flags} flags and ${s.reports} reports. What’s on this device now will be replaced.`}
          cancelLabel="Keep what I have"
          confirmLabel="Replace and reload"
          onCancel={() => setImporting(null)}
          onConfirm={confirmImport}
        />
      )}

      {resetting && (
        <ConfirmDialog
          title="Reset your progress?"
          body="XP, streak, lessons, every answer, reviews and mock history are deleted. This can’t be undone, unless you back up first."
          cancelLabel="Keep my progress"
          confirmLabel={alsoWorkings ? 'Delete everything' : 'Reset progress'}
          onCancel={() => {
            setResetting(false);
            setAlsoWorkings(false);
          }}
          onConfirm={confirmReset}
        >
          <label className={styles.also}>
            <input
              type="checkbox"
              checked={alsoWorkings}
              onChange={(e) => setAlsoWorkings(e.target.checked)}
            />
            Also delete my notes, flags and reports
          </label>
        </ConfirmDialog>
      )}
    </div>
  );
}
