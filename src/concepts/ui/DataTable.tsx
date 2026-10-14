/**
 * A small data table for the simulators. Row and column states carry a word as well as a
 * colour (a badge column, a "new" tag in the header), and nulls read as "null", the way Power
 * Query shows them. Wide tables scroll inside their own box rather than widening the page.
 */
import type { ReactNode } from 'react';
import type { Cell } from '../joins/engine';
import styles from './DataTable.module.css';

export interface Column {
  key: string;
  label?: string;
  /** "added" marks a column the operation created; "partial" one that holds nulls. */
  tone?: 'added' | 'partial' | undefined;
  render?: (value: Cell, row: TableRow) => ReactNode;
}

export interface TableRow {
  id: string;
  cells: Record<string, Cell>;
  /** Drives the row's look; the badge says the same in words. */
  state?: 'in' | 'out' | 'both' | 'left' | 'right' | 'counted' | 'skipped' | undefined;
  badge?: string | undefined;
}

interface Props {
  caption: string;
  note?: ReactNode;
  columns: Column[];
  rows: TableRow[];
  /** Header for the badge column, if rows have badges. */
  badgeLabel?: string;
  compact?: boolean;
}

export function DataTable({ caption, note, columns, rows, badgeLabel, compact = false }: Props) {
  const hasBadge = rows.some((r) => r.badge);
  return (
    <figure className={styles.figure} data-compact={compact || undefined}>
      <div className={styles.scroll} tabIndex={0} role="region" aria-label={`${caption} table`}>
        <table className={styles.table}>
          <caption className={styles.caption}>
            {caption}
            {note && <span className={styles.note}>{note}</span>}
          </caption>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" data-tone={c.tone}>
                  {c.label ?? c.key}
                  {c.tone === 'added' && <span className={styles.tag}>new</span>}
                </th>
              ))}
              {hasBadge && (
                <th scope="col" className={styles.badgeCol}>
                  {badgeLabel ?? 'In result'}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} data-state={r.state}>
                {columns.map((c) => {
                  const v = r.cells[c.key] ?? null;
                  return (
                    <td key={c.key} data-tone={c.tone} data-null={v === null || undefined}>
                      {c.render ? (
                        c.render(v, r)
                      ) : v === null ? (
                        <span className={styles.null}>null</span>
                      ) : (
                        v
                      )}
                    </td>
                  );
                })}
                {hasBadge && (
                  <td className={styles.badgeCol}>
                    <span className={styles.badge} data-state={r.state}>
                      {r.badge}
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
