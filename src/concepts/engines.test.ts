import { append, mergeColumns, type Table } from './append/engine';
import {
  cellContext,
  columnValue,
  MEASURES,
  PRODUCT_COLUMNS,
  PRODUCTS,
  SALES,
  visibleRows,
} from './dax/engine';
import { describeResult, join, type Row } from './joins/engine';
import { filterPath, SCHEMAS, tableFor } from './schema/engine';

describe('join kinds', () => {
  const orders: Row[] = [
    { OrderID: 'O1', CustomerID: 'C1' },
    { OrderID: 'O2', CustomerID: 'C2' },
    { OrderID: 'O3', CustomerID: 'C2' },
    { OrderID: 'O4', CustomerID: 'C4' },
  ];
  const customers: Row[] = [
    { CustomerID: 'C1', Name: 'Contoso' },
    { CustomerID: 'C2', Name: 'Fabrikam' },
    { CustomerID: 'C3', Name: 'Northwind' },
  ];
  const run = (kind: Parameters<typeof join>[4]) =>
    join(orders, customers, 'CustomerID', 'CustomerID', kind);
  const ids = (rows: ReturnType<typeof run>) =>
    rows.map((r) => `${r.left?.OrderID ?? '-'}/${r.right?.CustomerID ?? '-'}`);

  it('left outer keeps every order, matched where possible', () => {
    expect(ids(run('leftOuter'))).toEqual(['O1/C1', 'O2/C2', 'O3/C2', 'O4/-']);
  });
  it('right outer keeps every customer; one with two orders appears twice', () => {
    expect(ids(run('rightOuter'))).toEqual(['O1/C1', 'O2/C2', 'O3/C2', '-/C3']);
  });
  it('full outer keeps both sides', () => {
    expect(ids(run('fullOuter'))).toEqual(['O1/C1', 'O2/C2', 'O3/C2', 'O4/-', '-/C3']);
  });
  it('inner keeps matches only', () => {
    expect(ids(run('inner'))).toEqual(['O1/C1', 'O2/C2', 'O3/C2']);
  });
  it('anti joins keep only the unmatched side', () => {
    expect(ids(run('leftAnti'))).toEqual(['O4/-']);
    expect(ids(run('rightAnti'))).toEqual(['-/C3']);
  });
  it('a null key never matches', () => {
    expect(
      ids(
        join([{ OrderID: 'O9', CustomerID: null }], customers, 'CustomerID', 'CustomerID', 'inner'),
      ),
    ).toEqual([]);
  });
  it('describes the result in words', () => {
    expect(describeResult(run('fullOuter'), 'Orders', 'Customers')).toBe(
      '5 rows: 3 matched, 1 from Orders only, 1 from Customers only',
    );
  });
});

describe('append vs merge', () => {
  const jan: Table = {
    name: 'Jan',
    columns: ['Region', 'Amount'],
    rows: [{ Region: 'North', Amount: 10 }],
  };
  const feb: Table = {
    name: 'Feb',
    columns: ['Region', 'Amt', 'Channel'],
    rows: [{ Region: 'South', Amt: 20, Channel: 'Web' }],
  };

  it('append matches columns by name and fills the gaps with null', () => {
    const r = append([jan, feb]);
    expect(r.columns).toEqual(['Region', 'Amount', 'Amt', 'Channel']);
    expect(r.rows.map((x) => x.row)).toEqual([
      { Region: 'North', Amount: 10, Amt: null, Channel: null },
      { Region: 'South', Amount: null, Amt: 20, Channel: 'Web' },
    ]);
    expect(r.partial).toEqual(['Amount', 'Amt', 'Channel']);
  });

  it('renaming the column first lines them up', () => {
    const fixed = {
      ...feb,
      columns: ['Region', 'Amount', 'Channel'],
      rows: [{ Region: 'South', Amount: 20, Channel: 'Web' }],
    };
    expect(append([jan, fixed]).columns).toEqual(['Region', 'Amount', 'Channel']);
  });

  it('merge adds columns and leaves unmatched rows null', () => {
    const regions: Table = {
      name: 'Regions',
      columns: ['Region', 'Manager'],
      rows: [{ Region: 'North', Manager: 'Ana' }],
    };
    const base = { ...jan, rows: [...jan.rows, { Region: 'East', Amount: 5 }] };
    const r = mergeColumns(base, regions, 'Region', ['Manager']);
    expect(r.columns).toEqual(['Region', 'Amount', 'Regions.Manager']);
    expect(r.rows.map((x) => [x.row['Regions.Manager'], x.matched])).toEqual([
      ['Ana', true],
      [null, false],
    ]);
  });
});

describe('filter context', () => {
  const m = (id: string) => MEASURES.find((x) => x.id === id)!;
  const total = SALES.reduce((t, s) => t + s.amount, 0);

  it('a cell sees its row and column, intersected with the slicer', () => {
    const ctx = cellContext({ year: [2025] }, 'Red', 2026);
    expect(ctx).toEqual({ color: ['Red'], year: [] });
    expect(visibleRows(ctx)).toEqual([]);
    expect(visibleRows(cellContext({}, 'Red', 2025)).map((s) => s.id)).toEqual([1, 3, 4]);
  });

  it('Total sales sums the visible rows', () => {
    expect(m('total').evaluate(cellContext({}, 'Red', 2025)).value).toBe(500);
    expect(m('total').evaluate({}).value).toBe(total);
  });

  it('ALL removes only the Color filter', () => {
    expect(m('all').evaluate(cellContext({}, 'Blue', 2025)).value).toBe(400 + 60 + 40 + 30 + 90);
  });

  it('a boolean filter replaces Color; KEEPFILTERS intersects with it', () => {
    const blue = cellContext({}, 'Blue', null);
    expect(m('red').evaluate(blue).value).toBe(400 + 500 + 60 + 40 + 80);
    expect(m('redKeep').evaluate(blue).value).toBeNull();
    expect(m('redKeep').evaluate(cellContext({}, 'Red', null)).value).toBe(1080);
  });

  it('% of all colours divides by the Color-free context', () => {
    const e = m('share').evaluate(cellContext({}, 'Black', null));
    expect(e.value).toBeCloseTo(200 / total);
    expect(e.steps).toHaveLength(2);
  });

  it('context transition: SUM alone gives the grand total; CALCULATE and measures filter by row', () => {
    const [plain, calc, measure] = PRODUCT_COLUMNS;
    const bike = PRODUCTS[0]!;
    expect(columnValue(plain!, bike)).toBe(total);
    expect(columnValue(calc!, bike)).toBe(900);
    expect(columnValue(measure!, bike)).toBe(900);
  });
});

describe('star vs snowflake', () => {
  it('a Category filter takes one hop in a star and three in a snowflake', () => {
    const star = SCHEMAS.star;
    const snow = SCHEMAS.snowflake;
    expect(filterPath(star, tableFor(star, 'Category').id).map((r) => `${r.from}>${r.to}`)).toEqual(
      ['product>sales'],
    );
    expect(filterPath(snow, tableFor(snow, 'Category').id).map((r) => `${r.from}>${r.to}`)).toEqual(
      ['category>subcategory', 'subcategory>product', 'product>sales'],
    );
  });

  it('filters only travel from the one side to the many side', () => {
    // Nothing flows from Sales back to a dimension.
    expect(filterPath(SCHEMAS.star, 'sales')).toEqual([]);
  });
});
