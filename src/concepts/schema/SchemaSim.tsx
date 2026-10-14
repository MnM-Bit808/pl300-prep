/**
 * Star vs snowflake simulator: a model diagram where picking a filter lights up the path it
 * takes to the fact table, relationship by relationship. The snowflake can be flattened into a
 * star with the Power Query merges that would do it.
 *
 * Phones get their own vertical layout, so table names and columns stay readable instead of
 * shrinking with the drawing.
 */
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { ChipGroup } from '@/ui/ChipGroup';
import sim from '../ui/sim.module.css';
import {
  FILTER_FIELDS,
  FLATTEN_STEPS,
  filterPath,
  SCHEMAS,
  tableFor,
  type FilterField,
  type Relationship,
  type SchemaKind,
  type TableDef,
} from './engine';
import styles from './SchemaSim.module.css';

const SAMPLE: Record<FilterField, string> = {
  Category: 'Bikes',
  Subcategory: 'Road bikes',
  Year: '2026',
  City: 'Leeds',
};

type Pos = Record<string, { x: number; y: number }>;
interface Layout {
  width: number;
  height: number;
  boxW: number;
  pos: Pos;
}

const LAYOUTS: Record<'wide' | 'narrow', Record<SchemaKind, Layout>> = {
  wide: {
    star: {
      width: 760,
      height: 380,
      boxW: 160,
      pos: {
        date: { x: 20, y: 20 },
        customer: { x: 20, y: 240 },
        sales: { x: 300, y: 130 },
        product: { x: 580, y: 130 },
      },
    },
    snowflake: {
      width: 760,
      height: 400,
      boxW: 150,
      pos: {
        date: { x: 10, y: 20 },
        customer: { x: 10, y: 260 },
        sales: { x: 220, y: 130 },
        product: { x: 420, y: 130 },
        subcategory: { x: 600, y: 20 },
        category: { x: 600, y: 270 },
      },
    },
  },
  narrow: {
    star: {
      width: 360,
      height: 520,
      boxW: 165,
      pos: {
        date: { x: 5, y: 10 },
        customer: { x: 190, y: 10 },
        sales: { x: 97, y: 200 },
        product: { x: 97, y: 380 },
      },
    },
    snowflake: {
      width: 360,
      height: 650,
      // Narrower boxes than the star, so Product and Subcategory, side by side, leave room for
      // the arrow and both cardinality labels between them.
      boxW: 150,
      pos: {
        date: { x: 5, y: 10 },
        customer: { x: 205, y: 10 },
        sales: { x: 105, y: 195 },
        product: { x: 5, y: 380 },
        subcategory: { x: 205, y: 380 },
        category: { x: 205, y: 550 },
      },
    },
  },
};

const HEADER = 30;
const LINE = 20;
const boxH = (t: TableDef) => HEADER + t.columns.length * LINE + 10;

/** Where the line from a box's centre towards (tx, ty) leaves the box. */
function edgePoint(x: number, y: number, w: number, h: number, tx: number, ty: number) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  const t = Math.min(dx ? w / 2 / Math.abs(dx) : Infinity, dy ? h / 2 / Math.abs(dy) : Infinity);
  return { x: cx + dx * t, y: cy + dy * t };
}

function useNarrow(ref: RefObject<HTMLElement | null>) {
  const [narrow, setNarrow] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => setNarrow(el.clientWidth < 600);
    set();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return narrow;
}

function Diagram({
  kind,
  narrow,
  path,
  start,
  field,
}: {
  kind: SchemaKind;
  narrow: boolean;
  path: Relationship[];
  start: string;
  field: FilterField;
}) {
  const schema = SCHEMAS[kind];
  const L = LAYOUTS[narrow ? 'narrow' : 'wide'][kind];
  const onPath = new Set(path.flatMap((r) => [r.from, r.to]));
  const box = (id: string) => {
    const t = schema.tables.find((x) => x.id === id)!;
    return { ...L.pos[id]!, w: L.boxW, h: boxH(t), t };
  };
  const pathText = path.map((r) => `${box(r.from).t.name} to ${box(r.to).t.name}`).join(', then ');

  return (
    <svg
      viewBox={`0 0 ${L.width} ${L.height}`}
      className={styles.svg}
      role="img"
      aria-labelledby="schema-title schema-desc"
    >
      <title id="schema-title">{kind === 'star' ? 'Star schema' : 'Snowflake schema'}</title>
      <desc id="schema-desc">
        {`${schema.tables.length} tables. A filter on ${field} starts at ${box(start).t.name} and reaches Sales through ${path.length} ${path.length === 1 ? 'relationship' : 'relationships'}: ${pathText}.`}
      </desc>
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M0 0 10 5 0 10z" className={styles.arrowHead} />
        </marker>
        <marker
          id="arrow-hot"
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M0 0 10 5 0 10z" className={styles.arrowHot} />
        </marker>
      </defs>

      {schema.relationships.map((r) => {
        const a = box(r.from);
        const b = box(r.to);
        const p1 = edgePoint(a.x, a.y, a.w, a.h, b.x + b.w / 2, b.y + b.h / 2);
        const p2 = edgePoint(b.x, b.y, b.w, b.h, a.x + a.w / 2, a.y + a.h / 2);
        const hot = path.includes(r);
        const len = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
        const ux = (p2.x - p1.x) / len;
        const uy = (p2.y - p1.y) / len;
        const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        // Cardinality labels sit just off the line, near each end.
        const off = (p: { x: number; y: number }, along: number) => ({
          x: p.x + ux * along - uy * 12,
          y: p.y + uy * along + ux * 12,
        });
        const one = off(p1, 16);
        const many = off(p2, -16);
        return (
          <g key={`${r.from}-${r.to}`} data-hot={hot || undefined}>
            <line
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              className={hot ? styles.edgeHot : styles.edge}
            />
            {/* Filter direction: one side towards many side. */}
            <line
              x1={mid.x - ux * 6}
              y1={mid.y - uy * 6}
              x2={mid.x + ux * 4}
              y2={mid.y + uy * 4}
              className={styles.dirStub}
              markerEnd={hot ? 'url(#arrow-hot)' : 'url(#arrow)'}
            />
            <text
              x={one.x}
              y={one.y}
              className={styles.card}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              1
            </text>
            <text
              x={many.x}
              y={many.y}
              className={styles.card}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              *
            </text>
          </g>
        );
      })}

      {schema.tables.map((t) => {
        const b = box(t.id);
        const state =
          t.id === start
            ? 'start'
            : t.fact
              ? onPath.has(t.id)
                ? 'fact'
                : 'idle'
              : onPath.has(t.id)
                ? 'via'
                : 'idle';
        return (
          <g key={t.id} className={styles.table} data-state={state}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="10" className={styles.box} />
            <rect x={b.x} y={b.y} width={b.w} height={HEADER} rx="10" className={styles.head} />
            <rect x={b.x} y={b.y + HEADER - 10} width={b.w} height="10" className={styles.head} />
            <text x={b.x + 12} y={b.y + 20} className={styles.name}>
              {t.name}
              {t.fact ? ' (fact)' : ''}
            </text>
            {t.columns.map((c, i) => (
              <text
                key={c}
                x={b.x + 12}
                y={b.y + HEADER + 16 + i * LINE}
                className={styles.col}
                data-filtered={(t.id === start && c === field) || undefined}
              >
                {t.id === start && c === field ? `${c} = ${SAMPLE[field]}` : c}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export function SchemaSim() {
  const [kind, setKind] = useState<SchemaKind>('snowflake');
  const [field, setField] = useState<FilterField>('Category');
  const [flattened, setFlattened] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const narrow = useNarrow(wrap);

  // The Flatten button disappears once it's used, so hand focus to what it produced rather than
  // letting it fall back to the page.
  const flatSteps = useRef<HTMLElement>(null);
  const focusSteps = useRef(false);
  useEffect(() => {
    if (flattened && focusSteps.current) flatSteps.current?.focus();
    focusSteps.current = false;
  }, [flattened]);

  const schema = SCHEMAS[kind];
  const start = tableFor(schema, field);
  const path = filterPath(schema, start.id);
  const names = (r: Relationship) =>
    [
      schema.tables.find((t) => t.id === r.from)!.name,
      schema.tables.find((t) => t.id === r.to)!.name,
    ] as const;

  return (
    <div className={sim.sim}>
      <div className={sim.panel}>
        <ChipGroup
          legend="Model"
          value={kind}
          onChange={(k) => {
            setKind(k);
            setFlattened(false);
          }}
          options={[
            { value: 'snowflake', label: 'Snowflake' },
            { value: 'star', label: 'Star' },
          ]}
        />
        <ChipGroup
          legend="Filter a report by"
          value={field}
          onChange={setField}
          options={FILTER_FIELDS.map((f) => ({ value: f, label: f }))}
        />
      </div>

      <p className={sim.summary} role="status" aria-live="polite">
        {field} = {SAMPLE[field]} filters {start.name}, then reaches Sales in {path.length}{' '}
        {path.length === 1 ? 'hop' : 'hops'}.
      </p>

      <div ref={wrap} className={styles.diagram}>
        {/* Keyed so the path animation replays when the question changes. */}
        <Diagram
          key={`${kind}-${field}-${narrow}`}
          kind={kind}
          narrow={narrow}
          path={path}
          start={start.id}
          field={field}
        />
        <ul className={styles.key} aria-label="Key">
          <li>
            <span className={styles.keyStart} /> Filtered table
          </li>
          <li>
            <span className={styles.keyVia} /> On the filter’s path
          </li>
          <li>
            <span className={styles.keyEdge} /> 1 to * relationship, filtering one way
          </li>
        </ul>
      </div>

      <div className={sim.pair}>
        <section className={sim.panel} aria-labelledby="hops">
          <h2 id="hops" className={sim.panelTitle}>
            The filter’s path
          </h2>
          <ol className={styles.hops}>
            {path.map((r) => {
              const [from, to] = names(r);
              return (
                <li key={`${r.from}-${r.to}`}>
                  {from} filters {to} through <code>{r.key}</code>
                </li>
              );
            })}
          </ol>
        </section>
        <section className={sim.panel} aria-labelledby="tradeoff">
          <h2 id="tradeoff" className={sim.panelTitle}>
            {kind === 'star' ? 'Why Power BI prefers this' : 'What the snowflake costs'}
          </h2>
          <ul className={styles.points}>
            {kind === 'star' ? (
              <>
                <li>Every dimension is one hop from the facts, so filters and DAX stay simple.</li>
                <li>
                  {schema.tables.length} tables in the field list: one per thing you slice by.
                </li>
                <li>Fewer relationships for the engine to follow.</li>
              </>
            ) : (
              <>
                <li>A Category filter has to cross three relationships to reach Sales.</li>
                <li>
                  {schema.tables.length} tables in the field list, with product attributes spread
                  over three.
                </li>
                <li>
                  It saves a little repetition, which the column store compresses away anyway.
                </li>
              </>
            )}
          </ul>
        </section>
      </div>

      {kind === 'snowflake' ? (
        <div className={sim.panel}>
          <p className={sim.muted}>
            Power Query can fold the product chain into one Product table.
          </p>
          <button
            type="button"
            className={styles.flatten}
            onClick={() => {
              focusSteps.current = true;
              setKind('star');
              setFlattened(true);
            }}
          >
            Flatten into a star
          </button>
        </div>
      ) : (
        flattened && (
          <section ref={flatSteps} tabIndex={-1} className={sim.callout} aria-labelledby="flat">
            <h2 id="flat" className={sim.panelTitle}>
              Flattened with three Power Query steps
            </h2>
            <ol className={styles.hops}>
              {FLATTEN_STEPS.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </section>
        )
      )}
    </div>
  );
}
