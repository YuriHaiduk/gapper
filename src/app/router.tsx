import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { CardListHeader } from '@/features/cards/CardListHeader';
import { CardFormPage } from '@/pages/CardFormPage';
import { CardListPage } from '@/pages/CardListPage';
import { CategoriesPage } from '@/pages/CategoriesPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { AppLayout, type RouteHandle } from './AppLayout';
import { PublicOnly } from './PublicOnly';
import { RequireAuth } from './RequireAuth';
import { RootLayout } from './RootLayout';
import { RouteErrorPage } from './RouteErrorPage';

/** Route table (SPEC §6). Paths are relative to the base path (`/gapper/`). */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        path: 'login',
        element: (
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        ),
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <Navigate to="/cards" replace /> },
              {
                path: 'cards',
                element: <CardListPage />,
                handle: { title: 'Cards', Header: CardListHeader } satisfies RouteHandle,
              },
              {
                path: 'cards/new',
                element: <CardFormPage mode="create" />,
                handle: {
                  title: 'New card',
                  back: ({ search }) => `/cards${search}`,
                } satisfies RouteHandle,
              },
              {
                path: 'cards/:id/edit',
                element: <CardFormPage mode="edit" />,
                handle: {
                  title: 'Edit card',
                  back: ({ params, search }) => `/cards/${params.id ?? ''}${search}`,
                } satisfies RouteHandle,
              },
              {
                path: 'categories',
                element: <CategoriesPage />,
                handle: { title: 'Categories', back: '/cards' } satisfies RouteHandle,
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

let router: ReturnType<typeof createBrowserRouter> | null = null;

/** Created once, lazily — only after env validation passed (SPEC §21). */
export function getRouter() {
  router ??= createBrowserRouter(routes, { basename: import.meta.env.BASE_URL });
  return router;
}
