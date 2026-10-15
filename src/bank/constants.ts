/** Bank vocabulary used across the app. No Zod here, so importing it costs nothing. */

export const DOMAINS = ['prepare', 'model', 'visualize', 'manage', 'case'] as const;
export const QUESTION_TYPES = ['single', 'multi', 'yesno', 'order', 'dropdown'] as const;

export const ID_PREFIX = {
  prepare: 'PRE',
  model: 'MOD',
  visualize: 'VIS',
  manage: 'MAN',
  case: 'CASE',
} as const satisfies Record<(typeof DOMAINS)[number], string>;

export type Domain = (typeof DOMAINS)[number];
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Short names for tight places (tabs, tags); the full titles live with the course. */
export const DOMAIN_SHORT: Record<Domain, string> = {
  prepare: 'Prepare',
  model: 'Model',
  visualize: 'Visualize',
  manage: 'Manage',
  case: 'Case studies',
};
