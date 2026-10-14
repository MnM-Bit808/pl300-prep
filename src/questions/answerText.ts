import type { Question } from '@/bank/schema';

/** The correct answer written out, one line per part, for flashcard backs and reviews. */
export function answerLines(q: Question): string[] {
  switch (q.type) {
    case 'single':
      return [q.options.find((o) => o.id === q.answer)?.text ?? ''];
    case 'multi':
      return q.answer.map((id) => q.options.find((o) => o.id === id)?.text ?? '');
    case 'yesno':
      return q.statements.map((s, i) => `${q.answer[i] ? 'Yes' : 'No'}: ${s}`);
    case 'order':
      return q.answer.map((id, i) => `${i + 1}. ${q.items.find((it) => it.id === id)?.text ?? ''}`);
    case 'dropdown':
      return q.parts.map((p, i) => `${p.label}: ${p.options[q.answer.parts[i] ?? -1] ?? ''}`);
  }
}
