/**
 * The concept simulators. Each one is loaded on demand (its own chunk), and each names the
 * bank subtopics it explains, so question feedback can point to it.
 */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export interface Concept {
  id: string;
  title: string;
  /** One sentence: what you'll do. */
  summary: string;
  /** The rule to take away, shown as a formula bar. */
  rule: string;
  /** Bank subtopics this explains (for feedback links and practice). */
  subtopics: string[];
  topic: string;
  Component: LazyExoticComponent<ComponentType>;
}

export const CONCEPTS: Concept[] = [
  {
    id: 'join-kinds',
    title: 'Join kinds',
    summary:
      'Merge two tables with each of Power Query’s six join kinds, and change the keys to see rows match, drop out or repeat.',
    rule: 'Left outer keeps every row of the first table; a key that matches twice makes two rows.',
    subtopics: ['Merge queries'],
    topic: 'Transform and load the data',
    Component: lazy(() => import('./joins/JoinSim').then((m) => ({ default: m.JoinSim }))),
  },
  {
    id: 'append-vs-merge',
    title: 'Append vs Merge',
    summary:
      'Stack rows from another table, or add columns from one: watch the shape of the result change.',
    rule: 'Append adds rows and matches columns by name. Merge adds columns, matched on a key.',
    subtopics: ['Append queries', 'Merge queries'],
    topic: 'Transform and load the data',
    Component: lazy(() => import('./append/AppendSim').then((m) => ({ default: m.AppendSim }))),
  },
  {
    id: 'filter-context',
    title: 'Filter context',
    summary:
      'Click any cell of a matrix to see the filters it runs under, how CALCULATE changes them, and the exact rows it adds up.',
    rule: 'CALCULATE replaces filters on the columns you name; KEEPFILTERS intersects; ALL removes.',
    subtopics: ['CALCULATE and filter context', 'Calculated columns vs measures'],
    topic: 'Create model calculations by using DAX',
    Component: lazy(() => import('./dax/DaxSim').then((m) => ({ default: m.DaxSim }))),
  },
  {
    id: 'star-vs-snowflake',
    title: 'Star vs snowflake',
    summary:
      'Filter a dimension and follow the filter across relationships to the fact table, in a star and in a snowflake.',
    rule: 'Filters flow from the one side to the many side. A star reaches the facts in one hop.',
    subtopics: ['Star schema design', 'Relationships'],
    topic: 'Design and implement a data model',
    Component: lazy(() => import('./schema/SchemaSim').then((m) => ({ default: m.SchemaSim }))),
  },
];

export const conceptById = new Map(CONCEPTS.map((c) => [c.id, c]));

/** The first simulator that explains a subtopic, if any. */
export const conceptFor = (subtopic: string) =>
  CONCEPTS.find((c) => c.subtopics.includes(subtopic));
