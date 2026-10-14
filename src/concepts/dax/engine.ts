/**
 * A tiny, honest model of DAX filter context, enough to show what a matrix cell "sees".
 *
 * The model: Product (Product, Color) relates one-to-many to Sales (Product, Year, Amount);
 * Year sits on Sales. A filter context is a set of allowed values per column. A cell's context
 * is the slicer's filters intersected with the cell's own row (Color) and column (Year).
 *
 * Each measure evaluates by returning the context it actually used, step by step:
 * - CALCULATE with a boolean filter (Color = "Red") replaces any filter on that column;
 * - KEEPFILTERS(...) intersects with it instead;
 * - ALL(Product[Color]) removes the filter on that column;
 * - a measure referenced from a row context triggers context transition: the current row
 *   becomes a filter.
 */
export type Color = 'Red' | 'Blue' | 'Black';
export type Year = 2025 | 2026;

export interface Product {
  product: string;
  color: Color;
}
export interface Sale {
  id: number;
  product: string;
  year: Year;
  amount: number;
}

export const PRODUCTS: Product[] = [
  { product: 'Bike', color: 'Red' },
  { product: 'Helmet', color: 'Red' },
  { product: 'Gloves', color: 'Blue' },
  { product: 'Lamp', color: 'Black' },
];

export const SALES: Sale[] = [
  { id: 1, product: 'Bike', year: 2025, amount: 400 },
  { id: 2, product: 'Bike', year: 2026, amount: 500 },
  { id: 3, product: 'Helmet', year: 2025, amount: 60 },
  { id: 4, product: 'Helmet', year: 2025, amount: 40 },
  { id: 5, product: 'Helmet', year: 2026, amount: 80 },
  { id: 6, product: 'Gloves', year: 2025, amount: 30 },
  { id: 7, product: 'Gloves', year: 2026, amount: 50 },
  { id: 8, product: 'Gloves', year: 2026, amount: 20 },
  { id: 9, product: 'Lamp', year: 2025, amount: 90 },
  { id: 10, product: 'Lamp', year: 2026, amount: 110 },
];

export const COLORS: Color[] = ['Red', 'Blue', 'Black'];
export const YEARS: Year[] = [2025, 2026];

/** Allowed values per column; a missing column means "no filter". */
export interface FilterContext {
  color?: Color[] | undefined;
  year?: Year[] | undefined;
  product?: string[] | undefined;
}

const colorOf = (p: string) => PRODUCTS.find((x) => x.product === p)!.color;

/** Sales rows a filter context lets through (filters on Product flow to Sales). */
export const visibleRows = (ctx: FilterContext) =>
  SALES.filter(
    (s) =>
      (!ctx.color || ctx.color.includes(colorOf(s.product))) &&
      (!ctx.year || ctx.year.includes(s.year)) &&
      (!ctx.product || ctx.product.includes(s.product)),
  );

const sum = (ctx: FilterContext) => visibleRows(ctx).reduce((t, s) => t + s.amount, 0);

const intersect = <T>(a: T[] | undefined, b: T[] | undefined): T[] | undefined =>
  a === undefined ? b : b === undefined ? a : a.filter((x) => b.includes(x));

/** One step of an evaluation: a context and what the step did to it, in words. */
export interface Step {
  label: string;
  ctx: FilterContext;
  value: number;
}

export interface Evaluation {
  value: number | null;
  steps: Step[];
}

export interface Measure {
  id: string;
  name: string;
  dax: string;
  explain: string;
  evaluate: (ctx: FilterContext) => Evaluation;
}

const total = (
  ctx: FilterContext,
  label = 'SUM ( Sales[Amount] ) over the cell’s rows',
): Evaluation => {
  const value = sum(ctx);
  return { value, steps: [{ label, ctx, value }] };
};

const withColor = (ctx: FilterContext, color: Color[] | undefined): FilterContext => ({
  ...ctx,
  color,
});

export const MEASURES: Measure[] = [
  {
    id: 'total',
    name: 'Total sales',
    dax: 'Total sales = SUM ( Sales[Amount] )',
    explain: 'No CALCULATE: the cell’s filter context is used as it is.',
    evaluate: (ctx) => total(ctx),
  },
  {
    id: 'all',
    name: 'All colours',
    dax: 'All colours = CALCULATE ( [Total sales], ALL ( Product[Color] ) )',
    explain:
      'ALL removes the filter on Color, so every row shows the total for all colours (other filters, like Year, still apply).',
    evaluate: (ctx) => {
      const used = withColor(ctx, undefined);
      const value = sum(used);
      return {
        value,
        steps: [{ label: 'ALL ( Product[Color] ) removed the Color filter', ctx: used, value }],
      };
    },
  },
  {
    id: 'share',
    name: '% of all colours',
    dax: '% of all colours = DIVIDE ( [Total sales], [All colours] )',
    explain:
      'Two evaluations in one cell: the cell’s own rows, divided by the same rows with the Color filter removed.',
    evaluate: (ctx) => {
      const top = sum(ctx);
      const allCtx = withColor(ctx, undefined);
      const bottom = sum(allCtx);
      return {
        value: bottom ? top / bottom : null,
        steps: [
          { label: 'Numerator: [Total sales] in the cell’s context', ctx, value: top },
          { label: 'Denominator: [All colours], Color filter removed', ctx: allCtx, value: bottom },
        ],
      };
    },
  },
  {
    id: 'red',
    name: 'Red sales',
    dax: 'Red sales = CALCULATE ( [Total sales], Product[Color] = "Red" )',
    explain:
      'A boolean filter in CALCULATE replaces any existing filter on Color, so the Blue and Black rows show Red’s sales too.',
    evaluate: (ctx) => {
      const used = withColor(ctx, ['Red']);
      const value = sum(used);
      return {
        value,
        steps: [{ label: 'Color = "Red" replaced the Color filter', ctx: used, value }],
      };
    },
  },
  {
    id: 'redKeep',
    name: 'Red sales (KEEPFILTERS)',
    dax: 'Red sales kept = CALCULATE ( [Total sales], KEEPFILTERS ( Product[Color] = "Red" ) )',
    explain:
      'KEEPFILTERS intersects with the existing Color filter instead of replacing it: Blue and Black rows find no Red rows, so they’re blank.',
    evaluate: (ctx) => {
      const used = withColor(ctx, intersect(ctx.color, ['Red']));
      const rows = visibleRows(used);
      const value = rows.reduce((t, s) => t + s.amount, 0);
      return {
        value: rows.length ? value : null,
        steps: [
          { label: 'KEEPFILTERS kept the Color filter and added Color = "Red"', ctx: used, value },
        ],
      };
    },
  },
];

/** The filter context for a matrix cell: slicer ∩ the cell's row (Color) and column (Year). */
export function cellContext(
  slicer: FilterContext,
  color: Color | null,
  year: Year | null,
): FilterContext {
  return {
    color: intersect(slicer.color, color ? [color] : undefined),
    year: intersect(slicer.year, year ? [year] : undefined),
  };
}

/* ---------- Context transition (calculated columns on Product) ---------- */

export interface ColumnDef {
  id: string;
  dax: string;
  explain: string;
  /** The context the expression is evaluated in, for one Product row. */
  context: (row: Product) => FilterContext;
}

export const PRODUCT_COLUMNS: ColumnDef[] = [
  {
    id: 'plain',
    dax: 'Sales no transition = SUM ( Sales[Amount] )',
    explain:
      'A calculated column has a row context but no filter context. SUM ignores the row context, so every product shows the grand total.',
    context: () => ({}),
  },
  {
    id: 'calc',
    dax: 'Sales with CALCULATE = CALCULATE ( SUM ( Sales[Amount] ) )',
    explain:
      'CALCULATE turns the current row into a filter (context transition): each product sums only its own sales.',
    context: (row) => ({ product: [row.product] }),
  },
  {
    id: 'measure',
    dax: 'Sales via measure = [Total sales]',
    explain:
      'A measure reference is wrapped in an implicit CALCULATE, so context transition happens here too.',
    context: (row) => ({ product: [row.product] }),
  },
];

export const columnValue = (def: ColumnDef, row: Product) => sum(def.context(row));
