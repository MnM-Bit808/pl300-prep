/**
 * Runtime schema for the PL-300 question bank (pl300-bank/SCHEMA.md, schema version 2).
 *
 * The bank is authored outside the app and treated as read-only content, so every question is
 * parsed on load. Structural checks live here; cross-field rules (answer ids exist, counts match,
 * case references resolve) live in validate.ts.
 */
import { z } from '../lib/zod';
import { DOMAINS, type QuestionType } from './constants';

export { DOMAINS, ID_PREFIX, QUESTION_TYPES, type Domain, type QuestionType } from './constants';

const nonEmpty = z.string().trim().min(1);

export const ImageSchema = z.object({
  src: z.string().regex(/^images\/[a-z]+\/[\w-]+\.svg$/, 'expected images/<domain>/<name>.svg'),
  alt: nonEmpty,
});

const ChoiceSchema = z.object({ id: nonEmpty, text: nonEmpty });

const baseFields = {
  id: z.string().regex(/^(PRE|MOD|VIS|MAN|CASE)-\d{3}$/, 'expected an id like PRE-001'),
  caseId: nonEmpty.optional(),
  domain: z.enum(DOMAINS),
  topic: nonEmpty,
  subtopic: nonEmpty,
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  stem: nonEmpty,
  image: ImageSchema.nullable(),
  explanation: nonEmpty,
  takeaway: nonEmpty,
};

export const SingleQuestionSchema = z.object({
  ...baseFields,
  type: z.literal('single'),
  options: z.array(ChoiceSchema).min(2),
  answer: nonEmpty,
});

export const MultiQuestionSchema = z.object({
  ...baseFields,
  type: z.literal('multi'),
  options: z.array(ChoiceSchema).min(3),
  selectCount: z.int().min(2),
  answer: z.array(nonEmpty).min(2),
});

export const YesNoQuestionSchema = z.object({
  ...baseFields,
  type: z.literal('yesno'),
  statements: z.array(nonEmpty).min(1),
  answer: z.array(z.boolean()).min(1),
});

export const OrderQuestionSchema = z.object({
  ...baseFields,
  type: z.literal('order'),
  items: z.array(ChoiceSchema).min(2),
  answer: z.array(nonEmpty).min(2),
});

export const DropdownQuestionSchema = z.object({
  ...baseFields,
  type: z.literal('dropdown'),
  parts: z.array(z.object({ label: nonEmpty, options: z.array(nonEmpty).min(2) })).min(1),
  answer: z.object({ parts: z.array(z.int().min(0)).min(1) }),
});

export const QuestionSchema = z.discriminatedUnion('type', [
  SingleQuestionSchema,
  MultiQuestionSchema,
  YesNoQuestionSchema,
  OrderQuestionSchema,
  DropdownQuestionSchema,
]);

export const CaseTabSchema = z.object({
  title: nonEmpty,
  paragraphs: z.array(nonEmpty),
  image: ImageSchema.nullable(),
});

export const CaseStudySchema = z.object({
  id: z.string().regex(/^CS\d+$/, 'expected a case id like CS1'),
  title: nonEmpty,
  tabs: z.array(CaseTabSchema).min(1),
});

/** Envelope only: questions and cases are parsed one by one so a bad entry can't sink the bank. */
export const BankFileSchema = z.object({
  bank: z.string(),
  schemaVersion: z.literal(2),
  count: z.int(),
  questions: z.array(z.unknown()),
  cases: z.array(z.unknown()).default([]),
});

export type BankImage = z.infer<typeof ImageSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type QuestionOf<T extends QuestionType> = Extract<Question, { type: T }>;
export type CaseStudy = z.infer<typeof CaseStudySchema>;
export type CaseTab = z.infer<typeof CaseTabSchema>;
