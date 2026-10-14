import { use, useEffect, useMemo, useState } from 'react';
import { bankAssetUrl, loadBank } from '@/bank/load';
import { bankStats } from '@/bank/stats';
import styles from './BankReport.module.css';

type ImageState = 'loading' | 'ok' | 'failed';

/** Loads every referenced image in the browser and reports which resolve. */
function useImageCheck(srcs: readonly string[]) {
  const [state, setState] = useState<Record<string, ImageState>>({});
  useEffect(() => {
    let live = true;
    for (const src of srcs) {
      const img = new Image();
      img.onload = () => live && setState((s) => ({ ...s, [src]: 'ok' }));
      img.onerror = () => live && setState((s) => ({ ...s, [src]: 'failed' }));
      img.src = bankAssetUrl(src);
    }
    return () => {
      live = false;
    };
  }, [srcs]);
  return state;
}

function CountTable({ title, rows }: { title: string; rows: Record<string, number> }) {
  return (
    <table className={styles.table}>
      <caption>{title}</caption>
      <tbody>
        {Object.entries(rows).map(([k, v]) => (
          <tr key={k}>
            <th scope="row">{k}</th>
            <td>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function BankReport() {
  const bank = use(loadBank());
  const stats = useMemo(() => bankStats(bank.questions, bank.cases), [bank]);

  const images = useMemo(() => {
    const byId = new Map<string, { src: string; alt: string; refs: string[] }>();
    for (const q of bank.questions) {
      if (q.image) byId.set(q.image.src, { ...q.image, refs: [q.id] });
    }
    for (const c of bank.cases) {
      for (const t of c.tabs) if (t.image) byId.set(t.image.src, { ...t.image, refs: [c.id] });
    }
    return [...byId.values()];
  }, [bank]);
  const srcs = useMemo(() => images.map((i) => i.src), [images]);
  const imageState = useImageCheck(srcs);

  const ok = srcs.filter((s) => imageState[s] === 'ok').length;
  const failed = srcs.filter((s) => imageState[s] === 'failed');
  const done = ok + failed.length === srcs.length;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Developer check</p>
        <h1>Question bank</h1>
        <p className={styles.summary}>
          <strong>{stats.total}</strong> questions · <strong>{stats.cases.length}</strong> case
          studies · <strong>{stats.withImages}</strong> with an exhibit
        </p>
      </header>

      <section aria-labelledby="checks" className={styles.checks}>
        <h2 id="checks">Checks</h2>
        <ul>
          <li data-state={bank.issues.length ? 'failed' : 'ok'}>
            {bank.issues.length
              ? `${bank.issues.length} validation issues (see console)`
              : 'Validation: no issues'}
          </li>
          <li data-state={!done ? 'loading' : failed.length ? 'failed' : 'ok'} aria-live="polite">
            Images: {ok} of {srcs.length} loaded
            {failed.length > 0 && ` · missing: ${failed.join(', ')}`}
          </li>
        </ul>
      </section>

      <div className={styles.tables}>
        <CountTable title="By domain" rows={stats.byDomain} />
        <CountTable title="By type" rows={stats.byType} />
        <CountTable title="By difficulty" rows={stats.byDifficulty} />
        <CountTable
          title="Case studies"
          rows={Object.fromEntries(stats.cases.map((c) => [`${c.id} ${c.title}`, c.questions]))}
        />
      </div>

      <section aria-labelledby="exhibits">
        <h2 id="exhibits">Exhibits</h2>
        <ul className={styles.grid}>
          {images.map((img) => (
            <li key={img.src} data-state={imageState[img.src] ?? 'loading'}>
              <img src={bankAssetUrl(img.src)} alt={img.alt} loading="lazy" decoding="async" />
              <span>{img.refs.join(', ')}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
