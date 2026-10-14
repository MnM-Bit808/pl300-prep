/**
 * Mock exam state as a pure, serialisable reducer, so an exam in progress can be saved after
 * every change and resumed after a reload with the clock still running.
 *
 * Flow: answer questions in any order within a section → review the section → finish it.
 * Finishing section 1 locks it for good (as the real exam does before the case study); finishing
 * the last section, or the clock reaching zero, submits the exam.
 */
import type { Bank } from '@/bank/load';
import { newSeed } from '@/lib/random';
import { emptyAnswer, hasInput, isComplete, type Answer } from '@/questions/answer';
import { MOCK_MINUTES, type MockSection } from './build';

export interface ExamState {
  id: string;
  startedAt: string;
  /** Epoch ms when time runs out. The clock is wall-clock based, so it survives reloads. */
  endsAt: number;
  sections: MockSection[];
  section: number;
  /** Position within the current section. */
  index: number;
  answers: Record<string, Answer>;
  /** Shuffle seed per question, so options keep their order across visits and reloads. */
  seeds: Record<string, number>;
  marked: string[];
  /** Sections that have been finished and can no longer be changed. */
  locked: number[];
  view: 'question' | 'review';
  submitted: null | { at: string; timedOut: boolean };
}

export type ExamAction =
  | { type: 'answer'; questionId: string; answer: Answer }
  /** Renderers report changes as updaters (see AnswerUpdater), applied to the latest answer. */
  | { type: 'update'; questionId: string; update: (prev: Answer) => Answer }
  | { type: 'goto'; index: number }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'toggleMark'; questionId: string }
  | { type: 'review' }
  | { type: 'backToQuestions'; index?: number }
  | { type: 'finishSection'; at: string }
  | { type: 'timeUp'; at: string };

export function startExam(bank: Bank, sections: MockSection[], now: Date): ExamState {
  const ids = sections.flatMap((s) => s.questionIds);
  return {
    id: `mock-${now.getTime().toString(36)}`,
    startedAt: now.toISOString(),
    endsAt: now.getTime() + MOCK_MINUTES * 60_000,
    sections,
    section: 0,
    index: 0,
    answers: Object.fromEntries(
      ids.flatMap((id) => {
        const q = bank.questionById.get(id);
        return q ? [[id, emptyAnswer(q)]] : [];
      }),
    ),
    seeds: Object.fromEntries(ids.map((id) => [id, newSeed()])),
    marked: [],
    locked: [],
    view: 'question',
    submitted: null,
  };
}

export const currentIds = (s: ExamState) => s.sections[s.section]?.questionIds ?? [];
export const currentId = (s: ExamState) => currentIds(s)[s.index];
export const isLastSection = (s: ExamState) => s.section >= s.sections.length - 1;

export function examReducer(s: ExamState, action: ExamAction): ExamState {
  if (s.submitted) return s;
  const ids = currentIds(s);
  const clamp = (i: number) => Math.max(0, Math.min(ids.length - 1, i));

  switch (action.type) {
    case 'answer': {
      // Answers to a locked section, or to a question outside the current one, are ignored.
      if (!ids.includes(action.questionId)) return s;
      return { ...s, answers: { ...s.answers, [action.questionId]: action.answer } };
    }
    case 'update': {
      const prev = s.answers[action.questionId];
      if (!ids.includes(action.questionId) || !prev) return s;
      return { ...s, answers: { ...s.answers, [action.questionId]: action.update(prev) } };
    }
    case 'goto':
      return { ...s, view: 'question', index: clamp(action.index) };
    case 'next':
      return s.index >= ids.length - 1 ? { ...s, view: 'review' } : { ...s, index: s.index + 1 };
    case 'prev':
      return { ...s, index: clamp(s.index - 1) };
    case 'toggleMark': {
      if (!ids.includes(action.questionId)) return s;
      const marked = s.marked.includes(action.questionId)
        ? s.marked.filter((m) => m !== action.questionId)
        : [...s.marked, action.questionId];
      return { ...s, marked };
    }
    case 'review':
      return { ...s, view: 'review' };
    case 'backToQuestions':
      return { ...s, view: 'question', index: clamp(action.index ?? s.index) };
    case 'finishSection': {
      const locked = [...s.locked, s.section];
      if (isLastSection(s)) return { ...s, locked, submitted: { at: action.at, timedOut: false } };
      return { ...s, locked, section: s.section + 1, index: 0, view: 'question' };
    }
    case 'timeUp':
      return {
        ...s,
        locked: s.sections.map((_, i) => i),
        submitted: { at: action.at, timedOut: true },
      };
  }
}

/** How far a question has been answered, for the question map. */
export type TileState = 'answered' | 'partial' | 'empty';

export function tileState(bank: Bank, s: ExamState, id: string): TileState {
  const q = bank.questionById.get(id);
  const a = s.answers[id];
  if (!q || !a) return 'empty';
  if (isComplete(q, a)) return 'answered';
  return hasInput(a) ? 'partial' : 'empty';
}
