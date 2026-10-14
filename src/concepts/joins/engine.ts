/**
 * Power Query's six join kinds (Merge queries), on small in-memory tables.
 *
 * Every result row remembers where it came from (both tables, the first only, the second
 * only) so the simulator can say so in words. Row order follows Power Query: rows in the
 * first table's order, each with its matches in the second table's order; for joins that keep
 * second-table rows with no match, those come after.
 */
export type Cell = string | number | null;
export type Row = Record<string, Cell>;

export const JOIN_KINDS = [
  'leftOuter',
  'rightOuter',
  'fullOuter',
  'inner',
  'leftAnti',
  'rightAnti',
] as const;
export type JoinKind = (typeof JOIN_KINDS)[number];

export const JOIN_INFO: Record<JoinKind, { label: string; keeps: string }> = {
  leftOuter: {
    label: 'Left outer',
    keeps: 'All rows from the first table, with matching rows from the second',
  },
  rightOuter: {
    label: 'Right outer',
    keeps: 'All rows from the second table, with matching rows from the first',
  },
  fullOuter: { label: 'Full outer', keeps: 'All rows from both tables, matched where they can be' },
  inner: { label: 'Inner', keeps: 'Only rows that match in both tables' },
  leftAnti: { label: 'Left anti', keeps: 'Only rows from the first table that have no match' },
  rightAnti: { label: 'Right anti', keeps: 'Only rows from the second table that have no match' },
};

export type Provenance = 'both' | 'left' | 'right';

export interface JoinedRow {
  left: Row | null;
  right: Row | null;
  from: Provenance;
}

export function join(
  left: readonly Row[],
  right: readonly Row[],
  leftKey: string,
  rightKey: string,
  kind: JoinKind,
): JoinedRow[] {
  const keepLeftUnmatched = kind === 'leftOuter' || kind === 'fullOuter' || kind === 'leftAnti';
  const keepRightUnmatched = kind === 'rightOuter' || kind === 'fullOuter' || kind === 'rightAnti';
  const keepMatches = kind !== 'leftAnti' && kind !== 'rightAnti';

  const out: JoinedRow[] = [];
  const matchedRight = new Set<number>();

  if (kind === 'rightOuter') {
    // Right outer reads in the second table's order.
    for (const r of right) {
      const matches = left.filter((l) => l[leftKey] !== null && l[leftKey] === r[rightKey]);
      if (matches.length) for (const l of matches) out.push({ left: l, right: r, from: 'both' });
      else out.push({ left: null, right: r, from: 'right' });
    }
    return out;
  }

  for (const l of left) {
    const matches = right
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => l[leftKey] !== null && r[rightKey] === l[leftKey]);
    if (matches.length) {
      for (const { r, i } of matches) {
        matchedRight.add(i);
        if (keepMatches) out.push({ left: l, right: r, from: 'both' });
      }
    } else if (keepLeftUnmatched) {
      out.push({ left: l, right: null, from: 'left' });
    }
  }
  if (keepRightUnmatched) {
    right.forEach((r, i) => {
      if (!matchedRight.has(i)) out.push({ left: null, right: r, from: 'right' });
    });
  }
  return out;
}

/** In words: "5 rows: 4 matched, 1 from Orders only". */
export function describeResult(
  rows: readonly JoinedRow[],
  leftName: string,
  rightName: string,
): string {
  const n = (p: Provenance) => rows.filter((r) => r.from === p).length;
  const parts = [
    n('both') && `${n('both')} matched`,
    n('left') && `${n('left')} from ${leftName} only`,
    n('right') && `${n('right')} from ${rightName} only`,
  ].filter(Boolean);
  return `${rows.length} ${rows.length === 1 ? 'row' : 'rows'}${parts.length ? `: ${parts.join(', ')}` : ''}`;
}
