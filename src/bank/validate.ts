/**
 * Validates a raw bank file. Pure: no DOM, no file system, so the same rules run in the browser
 * on load and in `npm run check:bank` (which adds the image-on-disk check).
 *
 * Policy: a question that fails a rule is dropped and reported as an error; the rest of the bank
 * still loads. Oddities that don't affect play (unknown fields, count mismatches) are warnings.
 */
import {
  BankFileSchema,
  CaseStudySchema,
  ID_PREFIX,
  QuestionSchema,
  type BankImage,
  type CaseStudy,
  type Question,
} from './schema';

export type IssueLevel = 'error' | 'warning';

export interface BankIssue {
  level: IssueLevel;
  /** Question or case id, or "bank" for file-level problems. */
  ref: string;
  message: string;
}

export interface ValidatedBank {
  questions: Question[];
  cases: CaseStudy[];
  /** Every image the bank references, with the id that uses it. */
  images: { ref: string; image: BankImage }[];
  issues: BankIssue[];
}

const KNOWN_FIELDS = new Set([
  'id',
  'caseId',
  'domain',
  'topic',
  'subtopic',
  'difficulty',
  'type',
  'stem',
  'image',
  'options',
  'selectCount',
  'statements',
  'items',
  'parts',
  'answer',
  'explanation',
  'takeaway',
]);

const hasDuplicates = (values: readonly string[]) => new Set(values).size !== values.length;

/** Cross-field rules for one structurally valid question. Returns problems as messages. */
export function checkQuestionRules(q: Question): string[] {
  const problems: string[] = [];

  if (!q.id.startsWith(`${ID_PREFIX[q.domain]}-`)) {
    problems.push(`id prefix doesn't match domain "${q.domain}"`);
  }
  if (q.domain === 'case' && !q.caseId) problems.push('case question without caseId');
  if (q.domain !== 'case' && q.caseId) problems.push('caseId on a non-case question');

  switch (q.type) {
    case 'single': {
      const ids = q.options.map((o) => o.id);
      if (hasDuplicates(ids)) problems.push('duplicate option ids');
      if (!ids.includes(q.answer)) problems.push(`answer "${q.answer}" is not an option id`);
      break;
    }
    case 'multi': {
      const ids = q.options.map((o) => o.id);
      if (hasDuplicates(ids)) problems.push('duplicate option ids');
      if (q.selectCount >= q.options.length) problems.push('selectCount must be below option count');
      if (q.answer.length !== q.selectCount) {
        problems.push(`answer has ${q.answer.length} ids but selectCount is ${q.selectCount}`);
      }
      if (hasDuplicates(q.answer)) problems.push('duplicate ids in answer');
      for (const a of q.answer) if (!ids.includes(a)) problems.push(`answer "${a}" is not an option id`);
      break;
    }
    case 'yesno': {
      if (q.answer.length !== q.statements.length) {
        problems.push(`${q.statements.length} statements but ${q.answer.length} answers`);
      }
      break;
    }
    case 'order': {
      const ids = q.items.map((i) => i.id);
      if (hasDuplicates(ids)) problems.push('duplicate item ids');
      if (hasDuplicates(q.answer)) problems.push('duplicate ids in answer');
      if (q.answer.length > q.items.length) problems.push('answer is longer than the item list');
      for (const a of q.answer) if (!ids.includes(a)) problems.push(`answer "${a}" is not an item id`);
      break;
    }
    case 'dropdown': {
      if (q.answer.parts.length !== q.parts.length) {
        problems.push(`${q.parts.length} parts but ${q.answer.parts.length} answers`);
      }
      q.answer.parts.forEach((index, i) => {
        const part = q.parts[i];
        if (part && index >= part.options.length) {
          problems.push(`part ${i + 1} answer index ${index} is out of range`);
        }
      });
      break;
    }
  }
  return problems;
}

export function validateBank(raw: unknown): ValidatedBank {
  const issues: BankIssue[] = [];
  const result: ValidatedBank = { questions: [], cases: [], images: [], issues };

  const file = BankFileSchema.safeParse(raw);
  if (!file.success) {
    issues.push({ level: 'error', ref: 'bank', message: `not a bank file: ${file.error.message}` });
    return result;
  }

  for (const [index, rawCase] of file.data.cases.entries()) {
    const parsed = CaseStudySchema.safeParse(rawCase);
    if (!parsed.success) {
      issues.push({ level: 'error', ref: `cases[${index}]`, message: describe(parsed.error) });
      continue;
    }
    result.cases.push(parsed.data);
    for (const tab of parsed.data.tabs) {
      if (tab.image) result.images.push({ ref: parsed.data.id, image: tab.image });
    }
  }
  const caseIds = new Set(result.cases.map((c) => c.id));

  const seen = new Set<string>();
  for (const [index, rawQuestion] of file.data.questions.entries()) {
    const ref = idOf(rawQuestion) ?? `questions[${index}]`;
    const parsed = QuestionSchema.safeParse(rawQuestion);
    if (!parsed.success) {
      issues.push({ level: 'error', ref, message: describe(parsed.error) });
      continue;
    }
    const q = parsed.data;

    const problems = checkQuestionRules(q);
    if (seen.has(q.id)) problems.push('duplicate id');
    if (q.caseId && !caseIds.has(q.caseId)) problems.push(`unknown caseId "${q.caseId}"`);
    if (problems.length) {
      for (const message of problems) issues.push({ level: 'error', ref, message });
      continue;
    }

    for (const key of Object.keys(rawQuestion as object)) {
      if (!KNOWN_FIELDS.has(key)) issues.push({ level: 'warning', ref, message: `unknown field "${key}"` });
    }

    seen.add(q.id);
    result.questions.push(q);
    if (q.image) result.images.push({ ref: q.id, image: q.image });
  }

  if (file.data.count !== file.data.questions.length) {
    issues.push({
      level: 'warning',
      ref: 'bank',
      message: `header says ${file.data.count} questions, file has ${file.data.questions.length}`,
    });
  }
  return result;
}

function idOf(value: unknown): string | undefined {
  if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'string') {
    return value.id;
  }
  return undefined;
}

function describe(error: { issues: readonly { path: PropertyKey[]; message: string }[] }): string {
  return error.issues
    .map((i) => (i.path.length ? `${i.path.map(String).join('.')}: ${i.message}` : i.message))
    .join('; ');
}
