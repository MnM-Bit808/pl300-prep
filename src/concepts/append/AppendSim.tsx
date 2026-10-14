/**
 * Append vs Merge: the same January sales, either stacked with February (more rows) or
 * merged with a Regions lookup (more columns). The shape readout says what changed.
 */
import { useState } from 'react';
import { Link } from 'react-router';
import { ChipGroup } from '@/ui/ChipGroup';
import type { Row } from '../joins/engine';
import { DataTable, type TableRow } from '../ui/DataTable';
import sim from '../ui/sim.module.css';
import { append, mergeColumns, type Table } from './engine';
import styles from './AppendSim.module.css';

const JAN: Table = {
  name: 'Jan',
  columns: ['Region', 'Product', 'Amount'],
  rows: [
    { Region: 'North', Product: 'Bike', Amount: 400 },
    { Region: 'South', Product: 'Helmet', Amount: 60 },
    { Region: 'East', Product: 'Lamp', Amount: 90 },
  ],
};

// February's export calls the amount column "Amt" and adds a Channel column.
const FEB_RAW: Table = {
  name: 'Feb',
  columns: ['Region', 'Product', 'Amt', 'Channel'],
  rows: [
    { Region: 'North', Product: 'Gloves', Amt: 50, Channel: 'Web' },
    { Region: 'South', Product: 'Bike', Amt: 500, Channel: 'Store' },
  ],
};

const renamed = (t: Table): Table => ({
  ...t,
  columns: t.columns.map((c) => (c === 'Amt' ? 'Amount' : c)),
  rows: t.rows.map(({ Amt, ...rest }) => ({ ...rest, Amount: Amt ?? null }) as Row),
});

const REGIONS: Table = {
  name: 'Regions',
  columns: ['Region', 'Manager'],
  rows: [
    { Region: 'North', Manager: 'Ana' },
    { Region: 'South', Manager: 'Ravi' },
    { Region: 'West', Manager: 'Mei' },
  ],
};

type Op = 'append' | 'merge';

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

function Shape({ before, after }: { before: [number, number]; after: [number, number] }) {
  const dr = after[0] - before[0];
  const dc = after[1] - before[1];
  return (
    <p className={styles.shape} role="status" aria-live="polite">
      <span>
        Jan: {plural(before[0], 'row')} × {plural(before[1], 'column')}
      </span>{' '}
      <span className={styles.becomes}>becomes</span>{' '}
      <span>
        Result: {plural(after[0], 'row')} × {plural(after[1], 'column')}
      </span>{' '}
      <span className={styles.delta}>
        {dr ? `+${plural(dr, 'row')}` : 'no new rows'},{' '}
        {dc ? `+${plural(dc, 'column')}` : 'no new columns'}
      </span>
    </p>
  );
}

export function AppendSim() {
  const [op, setOp] = useState<Op>('append');
  const [fixed, setFixed] = useState(false);
  const feb = fixed ? renamed(FEB_RAW) : FEB_RAW;

  const appended = append([JAN, feb]);
  const merged = mergeColumns(JAN, REGIONS, 'Region', ['Manager']);

  const appendRows: TableRow[] = appended.rows.map((r, i) => ({
    id: `${r.source}-${i}`,
    cells: r.row,
    state: r.source === 'Feb' ? 'in' : undefined,
    badge: `From ${r.source}`,
  }));
  const mergeRows: TableRow[] = merged.rows.map((r, i) => ({
    id: `m-${i}`,
    cells: r.row,
    state: r.matched ? 'both' : 'left',
    badge: r.matched ? 'Matched' : 'No match',
  }));
  const unmatched = merged.rows.filter((r) => !r.matched).map((r) => r.row.Region);

  return (
    <div className={sim.sim}>
      <div className={sim.panel}>
        <ChipGroup
          legend="Operation"
          value={op}
          onChange={setOp}
          options={[
            { value: 'append', label: 'Append Feb to Jan' },
            { value: 'merge', label: 'Merge Regions into Jan' },
          ]}
        />
        <p className={sim.muted}>
          {op === 'append'
            ? 'Append stacks rows: Feb’s rows go under Jan’s. Columns are matched by name.'
            : 'Merge adds columns: each Jan row looks up its Region in Regions (left outer, the default).'}
        </p>
        {op === 'append' && (
          <label className={styles.fix}>
            <input type="checkbox" checked={fixed} onChange={(e) => setFixed(e.target.checked)} />
            <span>
              First rename Feb’s <code>Amt</code> column to <code>Amount</code>
            </span>
          </label>
        )}
      </div>

      <div className={sim.pair}>
        <DataTable
          caption="Jan"
          compact
          columns={JAN.columns.map((key) => ({ key }))}
          rows={JAN.rows.map((r, i) => ({ id: `j${i}`, cells: r }))}
        />
        {op === 'append' ? (
          <DataTable
            caption="Feb"
            compact
            columns={feb.columns.map((key) => ({ key }))}
            rows={feb.rows.map((r, i) => ({ id: `f${i}`, cells: r }))}
          />
        ) : (
          <DataTable
            caption="Regions"
            compact
            columns={REGIONS.columns.map((key) => ({ key }))}
            rows={REGIONS.rows.map((r, i) => ({ id: `r${i}`, cells: r }))}
          />
        )}
      </div>

      {op === 'append' ? (
        <>
          <Shape
            before={[JAN.rows.length, JAN.columns.length]}
            after={[appended.rows.length, appended.columns.length]}
          />
          <div key={`a-${fixed}`} className={sim.result}>
            <DataTable
              caption="Appended result"
              columns={appended.columns.map((key) => ({
                key,
                tone: !JAN.columns.includes(key)
                  ? 'added'
                  : appended.partial.includes(key)
                    ? 'partial'
                    : undefined,
              }))}
              rows={appendRows}
              badgeLabel="Row"
            />
          </div>
          {fixed ? (
            <p className={sim.callout}>
              <strong>Names line up, so the columns do.</strong> Only Channel is new, and Jan’s rows
              hold null in it because Jan never had one.
            </p>
          ) : (
            <p className={sim.callout}>
              <strong>Append matches columns by name.</strong> Feb’s <code>Amt</code> isn’t Jan’s{' '}
              <code>Amount</code>, so you get both, each half empty. Rename before appending.
            </p>
          )}
        </>
      ) : (
        <>
          <Shape
            before={[JAN.rows.length, JAN.columns.length]}
            after={[merged.rows.length, merged.columns.length]}
          />
          <div key="m" className={sim.result}>
            <DataTable
              caption="Merged result"
              columns={merged.columns.map((key) => ({
                key,
                tone: merged.added.includes(key) ? 'added' : undefined,
              }))}
              rows={mergeRows}
              badgeLabel="Lookup"
            />
          </div>
          <p className={sim.callout}>
            <strong>Merge never adds rows here, it adds columns.</strong> {unmatched.join(', ')}{' '}
            isn’t in Regions, so its Manager is null. See how other join kinds treat it in the{' '}
            <Link to="/concepts/join-kinds">Join kinds simulator</Link>.
          </p>
        </>
      )}
    </div>
  );
}
