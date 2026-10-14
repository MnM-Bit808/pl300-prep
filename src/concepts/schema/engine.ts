/**
 * Star vs snowflake: how a filter on a dimension reaches the fact table.
 *
 * Relationships are one-to-many with single-direction filtering (Power BI's default): a
 * filter flows from the "one" side to the "many" side. Following those arrows from the
 * filtered table to Sales gives the path the filter takes, one relationship per hop.
 */
export type SchemaKind = 'star' | 'snowflake';

export interface TableDef {
  id: string;
  name: string;
  columns: string[];
  fact?: boolean;
}

export interface Relationship {
  /** The "one" side (filters flow from here). */
  from: string;
  /** The "many" side. */
  to: string;
  key: string;
}

export interface Schema {
  tables: TableDef[];
  relationships: Relationship[];
}

const SALES: TableDef = {
  id: 'sales',
  name: 'Sales',
  columns: ['DateKey', 'CustomerKey', 'ProductKey', 'Amount'],
  fact: true,
};
const DATE: TableDef = { id: 'date', name: 'Date', columns: ['DateKey', 'Date', 'Month', 'Year'] };
const CUSTOMER: TableDef = {
  id: 'customer',
  name: 'Customer',
  columns: ['CustomerKey', 'Name', 'City'],
};

export const SCHEMAS: Record<SchemaKind, Schema> = {
  star: {
    tables: [
      SALES,
      DATE,
      CUSTOMER,
      {
        id: 'product',
        name: 'Product',
        columns: ['ProductKey', 'Product', 'Subcategory', 'Category'],
      },
    ],
    relationships: [
      { from: 'date', to: 'sales', key: 'DateKey' },
      { from: 'customer', to: 'sales', key: 'CustomerKey' },
      { from: 'product', to: 'sales', key: 'ProductKey' },
    ],
  },
  snowflake: {
    tables: [
      SALES,
      DATE,
      CUSTOMER,
      { id: 'product', name: 'Product', columns: ['ProductKey', 'Product', 'SubcategoryKey'] },
      {
        id: 'subcategory',
        name: 'Subcategory',
        columns: ['SubcategoryKey', 'Subcategory', 'CategoryKey'],
      },
      { id: 'category', name: 'Category', columns: ['CategoryKey', 'Category'] },
    ],
    relationships: [
      { from: 'date', to: 'sales', key: 'DateKey' },
      { from: 'customer', to: 'sales', key: 'CustomerKey' },
      { from: 'product', to: 'sales', key: 'ProductKey' },
      { from: 'subcategory', to: 'product', key: 'SubcategoryKey' },
      { from: 'category', to: 'subcategory', key: 'CategoryKey' },
    ],
  },
};

/** Fields a report author can filter by, and the table holding each, per schema. */
export const FILTER_FIELDS = ['Category', 'Subcategory', 'Year', 'City'] as const;
export type FilterField = (typeof FILTER_FIELDS)[number];

export function tableFor(schema: Schema, field: FilterField): TableDef {
  return schema.tables.find((t) => !t.fact && t.columns.includes(field))!;
}

/** The relationships a filter follows from `start` to the fact table, in order. */
export function filterPath(schema: Schema, start: string): Relationship[] {
  const fact = schema.tables.find((t) => t.fact)!.id;
  // Breadth-first along the filter direction (one side → many side).
  const queue: { at: string; path: Relationship[] }[] = [{ at: start, path: [] }];
  const seen = new Set([start]);
  while (queue.length) {
    const { at, path } = queue.shift()!;
    if (at === fact) return path;
    for (const r of schema.relationships.filter((x) => x.from === at && !seen.has(x.to))) {
      seen.add(r.to);
      queue.push({ at: r.to, path: [...path, r] });
    }
  }
  return [];
}

/** Power Query merges that turn the snowflake's product chain into one Product table. */
export const FLATTEN_STEPS = [
  'Merge Category into Subcategory on CategoryKey, keep Category',
  'Merge Subcategory into Product on SubcategoryKey, keep Subcategory and Category',
  'Remove the key columns and disable load for Subcategory and Category',
];
