/**
 * Your workings on one question: flag it to revisit, keep a note, or report a problem.
 * Shown once a question has been answered (feedback, results review, the lab).
 */
import { use, useState } from 'react';
import { AppDataContext, useWorkings, useWorkingsStore } from '@/progress/hooks';
import { FlagIcon, PencilIcon } from '@/ui/icons';
import { NoteEditor } from './NoteEditor';
import { ReportDialog } from './ReportDialog';
import styles from './QuestionTools.module.css';

/** Renders nothing where there's no saved data to write to (e.g. a bare component test). */
export function QuestionTools({ questionId }: { questionId: string }) {
  return use(AppDataContext) ? <Tools questionId={questionId} /> : null;
}

function Tools({ questionId }: { questionId: string }) {
  const doc = useWorkings();
  const store = useWorkingsStore();
  const flagged = Boolean(doc.flags[questionId]);
  const note = doc.questionNotes[questionId];
  const [noteOpen, setNoteOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [status, setStatus] = useState('');
  const noteId = `note-${questionId}`;

  return (
    <div className={styles.tools}>
      <div className={styles.row} role="group" aria-label="Your workings on this question">
        <button
          type="button"
          className={styles.tool}
          aria-pressed={flagged}
          onClick={() => {
            store.toggleFlag(questionId);
            setStatus(flagged ? 'Flag removed.' : 'Flagged to revisit.');
          }}
        >
          <FlagIcon /> {flagged ? 'Flagged' : 'Flag'}
        </button>
        <button
          type="button"
          className={styles.tool}
          aria-expanded={noteOpen}
          aria-controls={noteId}
          data-has={note ? '' : undefined}
          onClick={() => setNoteOpen((o) => !o)}
        >
          <PencilIcon /> {note ? 'Your note' : 'Add a note'}
        </button>
        <button type="button" className={styles.tool} onClick={() => setReporting(true)}>
          Report a problem
        </button>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
      {noteOpen && (
        <div id={noteId} className={styles.note}>
          <NoteEditor
            label={`Note on ${questionId}`}
            value={note?.text ?? ''}
            autoFocus={!note}
            onSave={(text) => store.setQuestionNote(questionId, text)}
          />
        </div>
      )}
      {reporting && (
        <ReportDialog
          questionId={questionId}
          onClose={() => setReporting(false)}
          onSubmit={async (kind, details) => {
            store.addReport({ questionId, kind, details });
            setReporting(false);
            // Say "saved" once it is: closing the tab straight after can't lose it.
            await store.flush();
            setStatus('Report saved. Export your reports from My workings.');
          }}
        />
      )}
      {status.startsWith('Report saved') && <p className={styles.saved}>{status}</p>}
    </div>
  );
}
