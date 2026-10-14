/**
 * Filter context simulator. Two views:
 * - Measures in a matrix: every cell is a button. Pick one to see the filters it runs under
 *   (from its row, its column and the slicer), what the measure's CALCULATE did to them, and
 *   exactly which Sales rows were added up.
 * - Calculated columns: a row context alone doesn't filter; CALCULATE (or a measure) turns the
 *   row into a filter.
 */
import { useState } from 'react';
import { ChipGroup } from '@/ui/ChipGroup';
import { DataTable, type TableRow } from '../ui/DataTable';
import sim from '../ui/sim.module.css';
import {
  cellContext,
  COLORS,
  columnValue,
  MEASURES,
  PRODUCT_COLUMNS,
  PRODUCTS,
  SALES,
  visibleRows,
  YEARS,
  type Color,
  type FilterContext,
  type Year,
} from './engine';
import styles from './DaxSim.module.css';

type View = 'measures' | 'columns';
interface CellPick {
  color: Color | null;
  year: Year | null;
}

const fmt = (v: number | null, share: boolean) =>
  v === null ? null : share ? `${(v * 100).toFixed(1)}%` : v.toLocaleString();

const colorOf = (p: string) => PRODUCTS.find((x) => x.product === p)!.color;

/** A filter context in words, one chip per column. */
function ContextChips({ ctx, changed }: { ctx: FilterContext; changed?: FilterContext }) {
  const part = (
    name: string,
    v: readonly (string | number)[] | undefined,
    was: readonly (string | number)[] | undefined,
  ) => {
    const text =
      v === undefined ? `${name}: any` : v.length ? `${name}: ${v.join(', ')}` : `${name}: nothing`;
    const differs = changed !== undefined && JSON.stringify(v) !== JSON.stringify(was);
    return (
      <li
        key={name}
        className={styles.chip}
        data-kind={v === undefined ? 'any' : 'set'}
        data-changed={differs || undefined}
      >
        {text}
        {differs && <span className={styles.changedTag}>changed</span>}
      </li>
    );
  };
  return (
    <ul className={styles.chips} aria-label="Filters">
      {part('Color', ctx.color, changed?.color)}
      {part('Year', ctx.year, changed?.year)}
      {ctx.product && part('Product', ctx.product, changed?.product)}
    </ul>
  );
}

function SalesTable({ ctx, caption }: { ctx: FilterContext; caption: string }) {
  const counted = new Set(visibleRows(ctx).map((s) => s.id));
  const rows: TableRow[] = SALES.map((s) => ({
    id: String(s.id),
    cells: { Product: s.product, Color: colorOf(s.product), Year: s.year, Amount: s.amount },
    state: counted.has(s.id) ? 'counted' : 'skipped',
    badge: counted.has(s.id) ? 'Yes' : 'No',
  }));
  const parts = SALES.filter((s) => counted.has(s.id)).map((s) => s.amount);
  const total = parts.reduce((a, b) => a + b, 0);
  return (
    <DataTable
      caption={caption}
      note={
        parts.length
          ? `${parts.join(' + ')} = ${total.toLocaleString()}`
          : 'No rows: the result is blank.'
      }
      compact
      columns={[{ key: 'Product' }, { key: 'Color' }, { key: 'Year' }, { key: 'Amount' }]}
      rows={rows}
      badgeLabel="Counted"
    />
  );
}

function MeasuresView() {
  const [measureId, setMeasureId] = useState('total');
  const [slicer, setSlicer] = useState<Year[]>([]);
  const [pick, setPick] = useState<CellPick>({ color: 'Red', year: 2025 });
  const [stepIndex, setStepIndex] = useState(0);
  const measure = MEASURES.find((m) => m.id === measureId)!;
  const share = measureId === 'share';
  const slicerCtx: FilterContext = slicer.length ? { year: slicer } : {};
  const years = slicer.length ? YEARS.filter((y) => slicer.includes(y)) : YEARS;

  const cellValue = (color: Color | null, year: Year | null) =>
    measure.evaluate(cellContext(slicerCtx, color, year)).value;

  // If the slicer hides the picked column, fall back to the row total.
  const effective: CellPick =
    pick.year !== null && !years.includes(pick.year) ? { ...pick, year: null } : pick;
  const ctx = cellContext(slicerCtx, effective.color, effective.year);
  const evaluation = measure.evaluate(ctx);
  const step = evaluation.steps[Math.min(stepIndex, evaluation.steps.length - 1)]!;
  const cellName = `${effective.color ?? 'All colours'}, ${effective.year ?? (slicer.length ? 'selected years' : 'all years')}`;

  const toggleYear = (y: Year) =>
    setSlicer((s) => (s.includes(y) ? s.filter((x) => x !== y) : [...s, y].sort()));

  const cellButton = (color: Color | null, year: Year | null) => {
    const v = fmt(cellValue(color, year), share);
    const selected = effective.color === color && effective.year === year;
    return (
      <button
        type="button"
        className={styles.cell}
        aria-pressed={selected}
        aria-label={`${color ?? 'Total'}, ${year ?? 'Total'}: ${v ?? 'blank'}`}
        onClick={() => {
          setPick({ color, year });
          setStepIndex(0);
        }}
      >
        {v ?? <span className={styles.blank}>blank</span>}
      </button>
    );
  };

  return (
    <div className={sim.sim}>
      <div className={sim.panel}>
        <ChipGroup
          legend="Measure"
          value={measureId}
          onChange={(id) => {
            setMeasureId(id);
            setStepIndex(0);
          }}
          options={MEASURES.map((m) => ({ value: m.id, label: m.name }))}
        />
        <div className={sim.formula}>
          <span className={sim.fx} aria-hidden="true">
            fx
          </span>
          <code>{measure.dax}</code>
        </div>
        <p className={sim.muted}>{measure.explain}</p>
        <div className={styles.slicer} role="group" aria-label="Year slicer">
          <span className={styles.slicerLabel}>Year slicer</span>
          {YEARS.map((y) => (
            <button
              key={y}
              type="button"
              className={styles.slice}
              aria-pressed={slicer.includes(y)}
              onClick={() => toggleYear(y)}
            >
              {y}
            </button>
          ))}
          <span className={styles.slicerNote}>
            {slicer.length ? '' : 'Nothing selected: no filter'}
          </span>
        </div>
      </div>

      <div className={styles.bench}>
        <div className={styles.matrixWrap}>
          <table className={styles.matrix}>
            <caption className={styles.matrixCaption}>
              {measure.name} by colour and year. Pick a cell to inspect it.
            </caption>
            <thead>
              <tr>
                <th scope="col">Color</th>
                {years.map((y) => (
                  <th key={y} scope="col">
                    {y}
                  </th>
                ))}
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {[...COLORS, null].map((c) => (
                <tr key={c ?? 'total'} data-total={c === null || undefined}>
                  <th scope="row">{c ?? 'Total'}</th>
                  {years.map((y) => (
                    <td key={y}>{cellButton(c, y)}</td>
                  ))}
                  <td>{cellButton(c, null)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className={sim.panel} aria-labelledby="inspect">
          <h2 id="inspect" className={sim.panelTitle}>
            {cellName}: {fmt(evaluation.value, share) ?? 'blank'}
          </h2>
          <p className="sr-only" role="status" aria-live="polite">
            {cellName}: {fmt(evaluation.value, share) ?? 'blank'}.
          </p>
          <div>
            <p className={styles.label}>The cell’s filter context</p>
            <ContextChips ctx={ctx} />
            <p className={styles.where}>
              {effective.color ? 'Color from the row. ' : 'The total row has no Color filter. '}
              {effective.year ? 'Year from the column. ' : 'The total column has no Year filter. '}
              {slicer.length ? `The slicer keeps ${slicer.join(' and ')}.` : ''}
            </p>
          </div>
          {evaluation.steps.length > 1 && (
            <ChipGroup
              legend="Evaluation"
              value={String(stepIndex)}
              onChange={(v) => setStepIndex(Number(v))}
              options={evaluation.steps.map((_step, i) => ({
                value: String(i),
                label: i === 0 ? 'Numerator' : 'Denominator',
              }))}
            />
          )}
          <div>
            <p className={styles.label}>{step.label}</p>
            <ContextChips ctx={step.ctx} changed={ctx} />
          </div>
          <SalesTable ctx={step.ctx} caption="Sales rows" />
        </section>
      </div>
    </div>
  );
}

function ColumnsView() {
  const [defId, setDefId] = useState(PRODUCT_COLUMNS[0]!.id);
  const [product, setProduct] = useState(PRODUCTS[0]!.product);
  const def = PRODUCT_COLUMNS.find((d) => d.id === defId)!;
  const row = PRODUCTS.find((p) => p.product === product)!;
  const name = def.dax.split(' = ')[0]!;

  return (
    <div className={sim.sim}>
      <div className={sim.panel}>
        <ChipGroup
          legend="Calculated column on Product"
          value={defId}
          onChange={setDefId}
          options={PRODUCT_COLUMNS.map((d) => ({ value: d.id, label: d.dax.split(' = ')[0]! }))}
        />
        <div className={sim.formula}>
          <span className={sim.fx} aria-hidden="true">
            fx
          </span>
          <code>{def.dax}</code>
        </div>
        <p className={sim.muted}>{def.explain}</p>
      </div>

      <div className={styles.bench}>
        <div className={styles.matrixWrap}>
          <table className={styles.matrix}>
            <caption className={styles.matrixCaption}>
              Product table, with the column. Pick a row to inspect it.
            </caption>
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col" data-text>
                  Color
                </th>
                <th scope="col">{name}</th>
              </tr>
            </thead>
            <tbody>
              {PRODUCTS.map((p) => (
                <tr key={p.product}>
                  <th scope="row">{p.product}</th>
                  <td data-text>{p.color}</td>
                  <td>
                    <button
                      type="button"
                      className={styles.cell}
                      aria-pressed={p.product === product}
                      aria-label={`${p.product}: ${columnValue(def, p).toLocaleString()}`}
                      onClick={() => setProduct(p.product)}
                    >
                      {columnValue(def, p).toLocaleString()}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className={sim.panel} aria-labelledby="inspect-col">
          <h2 id="inspect-col" className={sim.panelTitle}>
            {product}: {columnValue(def, row).toLocaleString()}
          </h2>
          <p className="sr-only" role="status" aria-live="polite">
            {product}: {columnValue(def, row).toLocaleString()}.
          </p>
          <div>
            <p className={styles.label}>Filter context while this row is evaluated</p>
            <ContextChips ctx={def.context(row)} />
          </div>
          <SalesTable ctx={def.context(row)} caption="Sales rows" />
        </section>
      </div>
    </div>
  );
}

export function DaxSim() {
  const [view, setView] = useState<View>('measures');
  return (
    <div className={`${sim.sim} ${styles.root}`}>
      <ChipGroup
        legend="View"
        value={view}
        onChange={setView}
        options={[
          { value: 'measures', label: 'Measures in a matrix' },
          { value: 'columns', label: 'Calculated columns' },
        ]}
      />
      {view === 'measures' ? <MeasuresView /> : <ColumnsView />}
    </div>
  );
}
