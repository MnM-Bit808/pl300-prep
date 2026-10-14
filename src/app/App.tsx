import { Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { BankReport } from '@/dev/BankReport';
import { LearnPage } from '@/learn/LearnPage';
import { LessonScreen } from '@/learn/LessonScreen';
import { QuestionLab } from '@/lab/QuestionLab';
import { ProgressProvider } from '@/progress/ProgressProvider';
import { Layout } from './Layout';

const loading = <p className="loading">Loading questions…</p>;

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <LearnPage /> },
      { path: 'lab', element: <QuestionLab /> },
      { path: 'dev/bank', element: <BankReport /> },
    ],
  },
  // Lessons run in focus mode, outside the site layout.
  {
    path: '/learn/:lessonId',
    element: (
      <Suspense fallback={loading}>
        <LessonScreen />
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
