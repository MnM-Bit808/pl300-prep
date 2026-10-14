/**
 * My workings (BUILD_PROMPT 4.7): everything you've written or marked, in one searchable place.
 * Notes on questions, notes on topics, flagged questions and problem reports.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { Question } from '@/bank/schema';
import { useBank } from '@/bank/useBank';
import { UNIT_INFO } from '@/learn/course';
import { formatDate } from '@/lib/dates';
import { plainText } from '@/lib/markdown';
import { downloadJson, backupFilename, makeReportsExport } from '@/data/backup';
import { useWorkings, useWorkingsStore } from '@/progress/hooks';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { DownloadIcon, FlagIcon, SearchIcon } from '@/ui/icons';
import { Markdown } from '@/ui/Markdown';
import buttons from '@/ui/buttons.module.css';
import { NoteEditor } from './NoteEditor';
import { REPORT_KIND_LABEL } from './store';
import styles from './WorkingsPage.module.css';

type Tab = 'notes' | 'topics' | 'flagged' | 'reports';

const firstLine = (q: Question) => q.stem.split('\n')[0]!.replace(/`/g, '');
const matches = (query: string, ...parts: (string | undefined)[]) =>
  !query || parts.some((p) => p?.toLowerCase().includes(query));

export function WorkingsPage() {
  const bank = useBank();
  const doc = useWorkings();
  const store = useWorkingsStore();
  const [tab, setTab] = useState<Tab>('notes');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<null | { kind: 'note' | 'report'; id: string }>(null);
  const q = query.trim().toLowerCase();

  const notes = Object.entries(doc.questionNotes)
    .flatMap(([id, note]) => {
      const question = bank.questionById.get(id);
      return question ? [{ id, note, question }] : [];
    })
    .filter((n) => matches(q, n.id, n.question.subtopic, n.question.stem, plainText(n.note.text)))
    .sort((a, b) => b.note.updatedAt.localeCompare(a.note.updatedAt));

  const topics = useMemo(() => {
    const seen = new Map<string, Question['domain']>();
    for (const x of bank.questions) if (!seen.has(x.topic)) seen.set(x.topic, x.domain);
    return [...seen];
  }, [bank]);
  const topicRows = topics.filter(([t]) => matches(q, t, plainText(doc.topicNotes[t]?.text ?? '')));
  const topicNoteCount = topics.filter(([t]) => doc.topicNotes[t]).length;

  const flagged = Object.entries(doc.flags)
    .flatMap(([id, at]) => {
      const question = bank.questionById.get(id);
      return question ? [{ id, at, question }] : [];
    })
    .filter((f) => matches(q, f.id, f.question.subtopic, f.question.stem))
    .sort((a, b) => b.at.localeCompare(a.at));

  const reports = [...doc.reports]
    .filter((r) =>
      matches(
        q,
        r.questionId,
        r.details,
        REPORT_KIND_LABEL[r.kind],
        bank.questionById.get(r.questionId)?.stem,
      ),
    )
    .reverse();

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'notes', label: 'Notes', count: notes.length },
    {
      id: 'topics',
      label: 'Topic notes',
      count: q ? topicRows.filter(([t]) => doc.topicNotes[t]).length : topicNoteCount,
    },
    { id: 'flagged', label: 'Flagged', count: flagged.length },
    { id: 'reports', label: 'Reports', count: reports.length },
  ];

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>My workings</h1>
      <p className={styles.lead}>
        Your notes, flags and problem reports, saved on this device. Back them up from{' '}
        <Link to="/settings">Settings</Link>.
      </p>

      <label className={styles.search}>
        <SearchIcon aria-hidden="true" />
        <span className="sr-only">Search your workings</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes, flags and reports"
          autoComplete="off"
        />
      </label>

      <div className={styles.tabs} role="group" aria-label="Show">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={styles.tab}
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label} <span className={styles.count}>{t.count}</span>
          </button>
        ))}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {q
          ? `${TABS.find((t) => t.id === tab)!.count} matching ${TABS.find((t) => t.id === tab)!.label.toLowerCase()}`
          : ''}
      </p>

      {tab === 'notes' &&
        (notes.length ? (
          <ul className={styles.list}>
            {notes.map(({ id, note, question }) => (
              <li key={id} className={styles.item}>
                <div className={styles.itemHead}>
                  <span className={styles.qid}>{id}</span>
                  <span className={styles.sub}>{question.subtopic}</span>
                  <span className={styles.date}>{formatDate(note.updatedAt)}</span>
                </div>
                <p className={styles.stem}>{firstLine(question)}</p>
                {editing === id ? (
                  <NoteEditor
                    label={`Note on ${id}`}
                    value={note.text}
                    autoFocus
                    onSave={(text) => store.setQuestionNote(id, text)}
                  />
                ) : (
                  <div className={styles.noteBody}>
                    <Markdown source={note.text} />
                  </div>
                )}
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.small}
                    onClick={() => setEditing(editing === id ? null : id)}
                  >
                    {editing === id ? 'Done' : 'Edit'}
                  </button>
                  <Link className={styles.small} to={`/lab?id=${id}`}>
                    Open the question
                  </Link>
                  <button
                    type="button"
                    className={styles.smallDanger}
                    onClick={() => setDeleting({ kind: 'note', id })}
                  >
                    Delete note
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty query={q} text="Notes you add after answering a question appear here." />
        ))}

      {tab === 'topics' &&
        (topicRows.length ? (
          <ul className={styles.list}>
            {topicRows.map(([topic, domain]) => {
              const note = doc.topicNotes[topic];
              return (
                <li key={topic}>
                  <details className={styles.topic} open={Boolean(q && note)}>
                    <summary className={styles.topicSummary}>
                      <span className={styles.topicName}>{topic}</span>
                      <span className={styles.sub}>
                        {UNIT_INFO[domain].title}
                        {note ? ', has a note' : ''}
                      </span>
                    </summary>
                    <div className={styles.topicBody}>
                      <NoteEditor
                        label={`Note on ${topic}`}
                        value={note?.text ?? ''}
                        onSave={(text) => store.setTopicNote(topic, text)}
                      />
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty query={q} text="No topics match." />
        ))}

      {tab === 'flagged' &&
        (flagged.length ? (
          <>
            {!q && (
              <Link to="/practice/run?mode=flagged" className={buttons.primary}>
                Practise flagged questions
              </Link>
            )}
            <ul className={styles.list}>
              {flagged.map(({ id, at, question }) => (
                <li key={id} className={styles.item}>
                  <div className={styles.itemHead}>
                    <FlagIcon className={styles.flag} aria-hidden="true" />
                    <span className={styles.qid}>{id}</span>
                    <span className={styles.sub}>{question.subtopic}</span>
                    <span className={styles.date}>Flagged {formatDate(at)}</span>
                  </div>
                  <p className={styles.stem}>{firstLine(question)}</p>
                  <div className={styles.actions}>
                    <Link className={styles.small} to={`/lab?id=${id}`}>
                      Open the question
                    </Link>
                    <button
                      type="button"
                      className={styles.small}
                      onClick={() => store.toggleFlag(id)}
                    >
                      Remove flag
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <Empty query={q} text="Flag a question after answering it, to come back to it later." />
        ))}

      {tab === 'reports' &&
        (reports.length ? (
          <>
            {!q && (
              <button
                type="button"
                className={buttons.secondary}
                onClick={() =>
                  downloadJson(backupFilename('reports'), makeReportsExport(bank, doc))
                }
              >
                <span className={styles.btnInner}>
                  <DownloadIcon aria-hidden="true" /> Export reports as JSON
                </span>
              </button>
            )}
            <ul className={styles.list}>
              {reports.map((r) => {
                const question = bank.questionById.get(r.questionId);
                return (
                  <li key={r.id} className={styles.item}>
                    <div className={styles.itemHead}>
                      <span className={styles.qid}>{r.questionId}</span>
                      <span className={styles.kind}>{REPORT_KIND_LABEL[r.kind]}</span>
                      <span className={styles.date}>{formatDate(r.at)}</span>
                    </div>
                    {question && <p className={styles.stem}>{firstLine(question)}</p>}
                    {r.details && <p className={styles.details}>{r.details}</p>}
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.smallDanger}
                        onClick={() => setDeleting({ kind: 'report', id: r.id })}
                      >
                        Delete report
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <Empty
            query={q}
            text="Report a problem from any answered question, and it’s kept here to export."
          />
        ))}

      {deleting && (
        <ConfirmDialog
          title={deleting.kind === 'note' ? 'Delete this note?' : 'Delete this report?'}
          body="This can’t be undone, unless you have a backup."
          cancelLabel="Keep it"
          confirmLabel="Delete"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            if (deleting.kind === 'note') store.setQuestionNote(deleting.id, '');
            else store.deleteReport(deleting.id);
            if (editing === deleting.id) setEditing(null);
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}

function Empty({ query, text }: { query: string; text: string }) {
  return <p className={styles.empty}>{query ? 'Nothing matches your search.' : text}</p>;
}
