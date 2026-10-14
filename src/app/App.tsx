/**
 * Routes. Learn (the home page) and the site frame ship in the main bundle; every other page is
 * its own chunk, fetched when first visited and precached for offline use by the service worker.
 */
import { Suspense, type ReactNode } from 'react';
import {
  createBrowserRouter,
  Outlet,
  RouterProvider,
  ScrollRestoration,
  type RouteObject,
} from 'react-router';
import { LearnPage } from '@/learn/LearnPage';
import { ProgressProvider } from '@/progress/ProgressProvider';
import { Loading, NotFound, RouteError } from './Fallbacks';
import { Layout } from './Layout';
import { RouteFocus } from './RouteFocus';

type Lazy = NonNullable<RouteObject['lazy']>;
/** Every page and screen takes no props. */
type Page = () => ReactNode;

/** A page inside the site frame (the frame provides the Suspense boundary). */
const page =
  <K extends string>(load: () => Promise<Record<K, Page>>, name: K): Lazy =>
  async () => ({ Component: (await load())[name] });

/** A focus-mode screen, outside the frame: it brings its own Suspense for the question bank. */
const screen =
  <K extends string>(load: () => Promise<Record<K, Page>>, name: K): Lazy =>
  async () => {
    const Screen: Page = (await load())[name];
    return {
      Component: () => (
        <Suspense fallback={<p className="loading">Loading questions…</p>}>
          <Screen />
        </Suspense>
      ),
    };
  };

function Root() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
      {/* After the page, so a page that places focus itself has already done so. */}
      <RouteFocus />
    </>
  );
}

const router = createBrowserRouter([
  {
    Component: Root,
    HydrateFallback: Loading,
    errorElement: <RouteError />,
    children: [
      {
        path: '/',
        Component: Layout,
        children: [
          { index: true, Component: LearnPage },
          {
            path: 'concepts',
            lazy: page(() => import('@/concepts/ConceptsPage'), 'ConceptsPage'),
          },
          {
            path: 'concepts/:id',
            lazy: page(() => import('@/concepts/ConceptPage'), 'ConceptPage'),
          },
          { path: 'practice', lazy: page(() => import('@/practice/PracticePage'), 'PracticePage') },
          { path: 'mock', lazy: page(() => import('@/mock/MockPage'), 'MockPage') },
          {
            path: 'mock/results/:id',
            lazy: page(() => import('@/mock/ResultsPage'), 'ResultsPage'),
          },
          { path: 'progress', lazy: page(() => import('@/progress/ProgressPage'), 'ProgressPage') },
          { path: 'workings', lazy: page(() => import('@/workings/WorkingsPage'), 'WorkingsPage') },
          { path: 'settings', lazy: page(() => import('@/settings/SettingsPage'), 'SettingsPage') },
          { path: 'lab', lazy: page(() => import('@/lab/QuestionLab'), 'QuestionLab') },
          { path: 'dev/bank', lazy: page(() => import('@/dev/BankReport'), 'BankReport') },
          { path: '*', Component: NotFound },
        ],
      },
      // Lessons, practice runs, the exam and flashcards run in focus mode, outside the frame.
      {
        path: '/learn/:lessonId',
        lazy: screen(() => import('@/learn/LessonScreen'), 'LessonScreen'),
      },
      {
        path: '/practice/run',
        lazy: screen(() => import('@/practice/PracticeRun'), 'PracticeRun'),
      },
      { path: '/mock/exam', lazy: screen(() => import('@/mock/ExamScreen'), 'ExamScreen') },
      {
        path: '/practice/cards',
        lazy: screen(() => import('@/practice/FlashcardsPage'), 'FlashcardsPage'),
      },
    ],
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
