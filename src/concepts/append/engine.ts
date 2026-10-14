/**
 * Append vs Merge in Power Query.
 * - Append stacks rows. Columns are matched by name: a column only one table has appears once,
 *   and rows from the other table get null in it. A misspelt name makes two half-empty columns.
 * - Merge adds columns from a second table, matched on a key (left outer, Power Query's
 *   default); a row with no match gets null in the new columns.
 */
import type { Cell, Row } from '../joins/engine';

export interface Table {
  name: string;
  columns: string[];
  rows: Row[];
}

export interface AppendResult {
  columns: string[];
  rows: { row: Row; source: string }[];
  /** Columns at least one input table doesn't have (they hold nulls). */
  partial: string[];
}

export function append(tables: readonly Table[]): AppendResult {
  const columns: string[] = [];
  for (const t of tables) for (const c of t.columns) if (!columns.includes(c)) columns.push(c);
  const rows = tables.flatMap((t) =>
    t.rows.map((r) => ({
      row: Object.fromEntries(
        columns.map((c) => [c, t.columns.includes(c) ? (r[c] ?? null) : null]),
      ) as Row,
      source: t.name,
    })),
  );
  const partial = columns.filter((c) => tables.some((t) => !t.columns.includes(c)));
  return { columns, rows, partial };
}

export interface MergeResult {
  columns: string[];
  /** Columns that came from the second table. */
  added: string[];
  rows: { row: Row; matched: boolean }[];
}

export function mergeColumns(
  base: Table,
  lookup: Table,
  key: string,
  bring: readonly string[],
): MergeResult {
  const added = bring.map((c) => `${lookup.name}.${c}`);
  const rows = base.rows.map((r) => {
    const hit = lookup.rows.find((l) => l[key] !== null && l[key] === r[key]);
    const extra: Record<string, Cell> = Object.fromEntries(
      bring.map((c, i) => [added[i]!, hit ? (hit[c] ?? null) : null]),
    );
    return { row: { ...r, ...extra }, matched: Boolean(hit) };
  });
  return { columns: [...base.columns, ...added], added, rows };
}
