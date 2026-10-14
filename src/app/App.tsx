import { createBrowserRouter, RouterProvider } from 'react-router';
import { BankReport } from '@/dev/BankReport';
import { QuestionLab } from '@/lab/QuestionLab';
import { Layout } from './Layout';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <QuestionLab /> },
      { path: 'dev/bank', element: <BankReport /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
