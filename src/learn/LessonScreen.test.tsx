import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { Suspense } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import rawBank from '../../pl300-bank/questions/all_questions.json';
import { buildBank } from '@/bank/load';
import type { Question } from '@/bank/schema';
import { ProgressProvider } from '@/progress/ProgressProvider';
import { ProgressStore } from '@/progress/store';
import { memoryStorage } from '@/storage/db';
import { buildCourse } from './course';
import { LessonScreen } from './LessonScreen';
import { XP_FIRST_TRY, XP_PERFECT_BONUS, XP_RETRY } from './session';

const bank = buildBank(rawBank);
const course = buildCourse(bank.questions, bank.cases);

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});

/** Answers the question on screen through the UI, right or (for single) wrong. */
function answer(q: Question, right = true) {
  const labelOf = (text: string) =>
    screen
      .getAllByRole(q.type === 'multi' ? 'checkbox' : 'radio')
      .find((i) => i.closest('label')?.textContent?.includes(text))!;
  switch (q.type) {
    case 'single': {
      const id = right ? q.answer : q.options.find((o) => o.id !== q.answer)!.id;
      fireEvent.click(labelOf(q.options.find((o) => o.id === id)!.text));
      break;
    }
    case 'multi':
      for (const id of q.answer) fireEvent.click(labelOf(q.options.find((o) => o.id === id)!.text));
      break;
    case 'yesno':
      screen
        .getAllByRole('radiogroup')
        .forEach((g, i) => fireEvent.click(within(g).getByLabelText(q.answer[i] ? 'Yes' : 'No')));
      break;
    case 'dropdown':
      q.parts.forEach((p, i) =>
        fireEvent.change(screen.getByLabelText(p.label), {
          target: { value: String(q.answer.parts[i]) },
        }),
      );
      break;
    case 'order': {
      const pool = within(screen.getByRole('region', { name: 'Actions' }));
      for (const id of q.answer) {
        const text = q.items.find((it) => it.id === id)!.text;
        fireEvent.click(
          pool.getAllByRole('button').find((b) => b.textContent?.includes(text.slice(0, 30)))!,
        );
      }
      break;
    }
  }
  fireEvent.click(screen.getByRole('button', { name: 'Check' }));
}

/** The question on screen, found by its stem. */
function onScreen(ids: readonly string[]): Question {
  const stem = document.querySelector('[id$="-stem"]')?.textContent ?? '';
  const q = ids
    .map((id) => bank.questionById.get(id)!)
    .find((x) => stem.startsWith(x.stem.split('\n')[0]!.replace(/`/g, '')));
  if (!q) throw new Error(`No lesson question matches the stem: ${stem.slice(0, 60)}`);
  return q;
}

async function renderLesson(lessonId: string) {
  const store = await ProgressStore.open(memoryStorage(), () => new Date('2026-10-14T09:00:00'));
  const router = createMemoryRouter(
    [
      { path: '/learn/:lessonId', element: <LessonScreen /> },
      { path: '/', element: <p>Learn page</p> },
    ],
    { initialEntries: [`/learn/${lessonId}`] },
  );
  await act(async () => {
    render(
      <ProgressProvider store={store}>
        <Suspense fallback={<p>Loading</p>}>
          <RouterProvider router={router} />
        </Suspense>
      </ProgressProvider>,
    );
  });
  await screen.findByRole('progressbar', { name: 'Lesson progress' });
  return { store, router };
}

describe('LessonScreen', () => {
  it('a perfect run: every question right, finish screen, XP and completion saved', async () => {
    const lesson = course.lessonById.get('prepare-1')!;
    const { store } = await renderLesson(lesson.id);

    for (let i = 0; i < lesson.questionIds.length; i++) {
      answer(onScreen(lesson.questionIds));
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    }

    expect(await screen.findByRole('heading', { name: 'Perfect lesson' })).toBeInTheDocument();
    const xp = lesson.questionIds.length * XP_FIRST_TRY + XP_PERFECT_BONUS;
    expect(screen.getByText(`+${xp}`)).toBeInTheDocument();

    const doc = store.getSnapshot();
    expect(doc.lessons[lesson.id]).toMatchObject({ bestAccuracy: 1, completions: 1 });
    expect(doc.xp.total).toBe(xp);
    expect(doc.xp.streak.count).toBe(1);
    expect(Object.keys(doc.questions).sort()).toEqual([...lesson.questionIds].sort());
    expect(screen.getByRole('link', { name: 'Next lesson' })).toHaveAttribute(
      'href',
      '/learn/prepare-2',
    );
  });

  it('a miss costs a heart, comes back at the end, and earns retry XP', async () => {
    // A lesson whose first question is single choice, so it can be missed on purpose.
    const lesson = course.lessons.find(
      (l) => !l.caseId && bank.questionById.get(l.questionIds[0]!)!.type === 'single',
    )!;
    const { store } = await renderLesson(lesson.id);

    const first = onScreen(lesson.questionIds);
    answer(first, false);
    expect(screen.getByLabelText('4 hearts left')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    for (let i = 1; i < lesson.questionIds.length; i++) {
      answer(onScreen(lesson.questionIds));
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    }
    // The missed question returns last, flagged as a second go.
    expect(screen.getByText('Second go: you missed this one earlier')).toBeInTheDocument();
    expect(onScreen(lesson.questionIds).id).toBe(first.id);
    answer(first);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('heading', { name: 'Lesson complete' })).toBeInTheDocument();
    const n = lesson.questionIds.length;
    expect(store.getSnapshot().xp.total).toBe((n - 1) * XP_FIRST_TRY + XP_RETRY);
    expect(store.getSnapshot().lessons[lesson.id]!.bestAccuracy).toBeCloseTo((n - 1) / n);
  });

  it('quitting asks first, and banks nothing', async () => {
    const { store, router } = await renderLesson('prepare-1');
    fireEvent.click(screen.getByRole('button', { name: 'Quit lesson' }));
    expect(screen.getByRole('heading', { name: 'Quit this lesson?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep going' }));
    expect(screen.queryByRole('heading', { name: 'Quit this lesson?' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Quit lesson' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Quit' }));
    });
    expect(router.state.location.pathname).toBe('/');
    expect(store.getSnapshot().xp.total).toBe(0);
  });
});
