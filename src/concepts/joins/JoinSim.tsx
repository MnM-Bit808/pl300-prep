/**
 * Join kinds simulator: Orders merged with Customers on CustomerID. Pick a join kind, or change
 * an order's customer, and the result, every row's fate and a summary update together.
 */
import { useState } from 'react';
import { ChipGroup } from '@/ui/ChipGroup';
import { DataTable, type TableRow } from '../ui/DataTable';
import sim from '../ui/sim.module.css';
import { describeResult, join, JOIN_INFO, JOIN_KINDS, type JoinKind, type Row } from './engine';

const CUSTOMERS: Row[] = [
  { CustomerID: 'C1', Name: 'Contoso', City: 'Seattle' },
  { CustomerID: 'C2', Name: 'Fabrikam', City: 'Leeds' },
  { CustomerID: 'C3', Name: 'Northwind', City: 'Oslo' },
];

const START: Row[] = [
  { OrderID: 'O1', CustomerID: 'C1', Amount: 120 },
  { OrderID: 'O2', CustomerID: 'C2', Amount: 80 },
  { OrderID: 'O3', CustomerID: 'C2', Amount: 45 },
  { OrderID: 'O4', CustomerID: 'C4', Amount: 60 },
];

const KEY_CHOICES = ['C1', 'C2', 'C3', 'C4', ''] as const;

/** Two overlapping circles with the parts each join keeps filled in. */
function Venn({ kind }: { kind: JoinKind }) {
  const left = kind === 'leftOuter' || kind === 'fullOuter' || kind === 'leftAnti';
  const right = kind === 'rightOuter' || kind === 'fullOuter' || kind === 'rightAnti';
  const middle = kind !== 'leftAnti' && kind !== 'rightAnti';
  return (
    <svg viewBox="0 0 36 22" width="34" height="20" aria-hidden="true">
      <defs>
        <clipPath id={`vl-${kind}`}>
          <circle cx="13" cy="11" r="9" />
        </clipPath>
      </defs>
      {left && <circle cx="13" cy="11" r="9" fill="currentColor" opacity="0.85" />}
      {right && <circle cx="23" cy="11" r="9" fill="currentColor" opacity="0.85" />}
      {/* The overlap: filled for matches, cut out (paper colour) when a join drops matches. */}
      <circle
        cx="23"
        cy="11"
        r="9"
        clipPath={`url(#vl-${kind})`}
        fill={middle ? 'currentColor' : 'var(--paper)'}
      />
      <circle cx="13" cy="11" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="23" cy="11" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function JoinSim() {
  const [kind, setKind] = useState<JoinKind>('leftOuter');
  const [orders, setOrders] = useState<Row[]>(START);
  const result = join(orders, CUSTOMERS, 'CustomerID', 'CustomerID', kind);

  const inResult = (side: 'left' | 'right', row: Row) => result.some((r) => r[side] === row);
  const repeated = CUSTOMERS.filter(
    (c) => result.filter((r) => r.right === c && r.left).length > 1,
  );

  const orderRows: TableRow[] = orders.map((o) => ({
    id: String(o.OrderID),
    cells: o,
    state: inResult('left', o) ? 'in' : 'out',
    badge: inResult('left', o) ? 'Kept' : 'Left out',
  }));
  const customerRows: TableRow[] = CUSTOMERS.map((c) => ({
    id: String(c.CustomerID),
    cells: c,
    state: inResult('right', c) ? 'in' : 'out',
    badge: inResult('right', c) ? 'Kept' : 'Left out',
  }));
  const resultRows: TableRow[] = result.map((r, i) => ({
    id: `${i}`,
    cells: {
      OrderID: r.left?.OrderID ?? null,
      CustomerID: r.left?.CustomerID ?? null,
      Amount: r.left?.Amount ?? null,
      'Customers.Name': r.right?.Name ?? null,
      'Customers.City': r.right?.City ?? null,
    },
    state: r.from,
    badge: r.from === 'both' ? 'Both tables' : r.from === 'left' ? 'Orders only' : 'Customers only',
  }));

  return (
    <div className={sim.sim}>
      <div className={sim.panel}>
        <ChipGroup
          legend="Join kind"
          value={kind}
          onChange={setKind}
          options={JOIN_KINDS.map((k) => ({
            value: k,
            label: (
              <>
                <Venn kind={k} /> {JOIN_INFO[k].label}
              </>
            ),
          }))}
        />
        <p className={sim.muted}>{JOIN_INFO[kind].keeps}.</p>
      </div>

      <div className={sim.pair}>
        <DataTable
          caption="Orders (first table)"
          note="Change a CustomerID to see what matches."
          compact
          columns={[
            { key: 'OrderID' },
            {
              key: 'CustomerID',
              render: (v, row) => (
                <select
                  className={sim.selectCell}
                  aria-label={`CustomerID for ${row.id}`}
                  value={v === null ? '' : String(v)}
                  onChange={(e) => {
                    const next = e.target.value || null;
                    setOrders((os) =>
                      os.map((o) => (o.OrderID === row.id ? { ...o, CustomerID: next } : o)),
                    );
                  }}
                >
                  {KEY_CHOICES.map((k) => (
                    <option key={k} value={k}>
                      {k || 'null'}
                    </option>
                  ))}
                </select>
              ),
            },
            { key: 'Amount' },
          ]}
          rows={orderRows}
          badgeLabel="Result"
        />
        <DataTable
          caption="Customers (second table)"
          compact
          columns={[{ key: 'CustomerID' }, { key: 'Name' }, { key: 'City' }]}
          rows={customerRows}
          badgeLabel="Result"
        />
      </div>

      <p className={sim.summary} role="status" aria-live="polite">
        {JOIN_INFO[kind].label} join: {describeResult(result, 'Orders', 'Customers')}.
      </p>

      <div key={`${kind}-${orders.map((o) => o.CustomerID).join()}`} className={sim.result}>
        <DataTable
          caption="Merged result"
          note="Customers columns expanded, as you would after Merge queries."
          columns={[
            { key: 'OrderID' },
            { key: 'CustomerID' },
            { key: 'Amount' },
            { key: 'Customers.Name', tone: 'added' },
            { key: 'Customers.City', tone: 'added' },
          ]}
          rows={resultRows}
          badgeLabel="Came from"
        />
      </div>

      {repeated.length > 0 && kind !== 'leftAnti' && kind !== 'rightAnti' && (
        <p className={sim.callout}>
          <strong>Rows can multiply.</strong> {repeated.map((c) => c.Name).join(' and ')}{' '}
          {repeated.length === 1 ? 'matches' : 'match'} more than one order, so{' '}
          {repeated.length === 1 ? 'it appears' : 'they appear'} once per order. A merge can return
          more rows than either table has.
        </p>
      )}
      {(kind === 'leftAnti' || kind === 'rightAnti') && (
        <p className={sim.callout}>
          <strong>Anti joins find what’s missing.</strong>{' '}
          {kind === 'leftAnti'
            ? 'Orders with no matching customer: a quick data-quality check before you load.'
            : 'Customers who never ordered: the people a report of sales would never show.'}
        </p>
      )}
    </div>
  );
}
