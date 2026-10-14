import { Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { BankReport } from '@/dev/BankReport';
import { LearnPage } from '@/learn/LearnPage';
import { LessonScreen } from '@/learn/LessonScreen';
import { QuestionLab } from '@/lab/QuestionLab';
import { ExamScreen } from '@/mock/ExamScreen';
import { MockPage } from '@/mock/MockPage';
import { ResultsPage } from '@/mock/ResultsPage';
import { FlashcardsPage } from '@/practice/FlashcardsPage';
import { PracticePage } from '@/practice/PracticePage';
import { PracticeRun } from '@/practice/PracticeRun';
import { ProgressPage } from '@/progress/ProgressPage';
import { ProgressProvider } from '@/progress/ProgressProvider';
import { SettingsPage } from '@/settings/SettingsPage';
import { WorkingsPage } from '@/workings/WorkingsPage';
import { Layout } from './Layout';

const loading = <p className="loading">Loading questions…</p>;

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <LearnPage /> },
      { path: 'practice', element: <PracticePage /> },
      { path: 'mock', element: <MockPage /> },
      { path: 'mock/results/:id', element: <ResultsPage /> },
      { path: 'progress', element: <ProgressPage /> },
      { path: 'workings', element: <WorkingsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'lab', element: <QuestionLab /> },
      { path: 'dev/bank', element: <BankReport /> },
    ],
  },
  // Lessons, practice runs and flashcards run in focus mode, outside the site layout.
  {
    path: '/learn/:lessonId',
    element: (
      <Suspense fallback={loading}>
        <LessonScreen />
      </Suspense>
    ),
  },
  {
    path: '/practice/run',
    element: (
      <Suspense fallback={loading}>
        <PracticeRun />
      </Suspense>
    ),
  },
  {
    path: '/mock/exam',
    element: (
      <Suspense fallback={loading}>
        <ExamScreen />
      </Suspense>
    ),
  },
  {
    path: '/practice/cards',
    element: (
      <Suspense fallback={loading}>
        <FlashcardsPage />
      </Suspense>
    ),
  },
]);

export function App() {
  return (
    <Suspense fallback={<p className="loading">Loading your progress…</p>}>
      <ProgressProvider>
        <RouterProvider router={router} />
      </ProgressProvider>
    </Suspense>
  );
}
