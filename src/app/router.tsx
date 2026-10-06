import type { ComponentType } from 'react';
import {
  createBrowserRouter,
  Navigate,
  type LazyRouteFunction,
  type RouteObject,
} from 'react-router-dom';
import CallbackPage from '../features/auth/callback-page';
import RequireAuth from '../features/auth/require-auth';
import HomePage from '../features/home/home-page';
import AppShell from './shell/app-shell';
import RouteError from './ui/route-error';

/** Code-splits a page: its chunk loads on first navigation. */
const page =
  (
    load: () => Promise<{ default: ComponentType }>,
  ): LazyRouteFunction<RouteObject> =>
  async () => ({ Component: (await load()).default });

function PageFallback() {
  return <div className="min-h-dvh" aria-busy="true" />;
}

export const routes: RouteObject[] = [
  {
    path: '/callback',
    element: <CallbackPage />,
    errorElement: <RouteError />,
  },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    errorElement: <RouteError />,
    HydrateFallback: PageFallback,
    children: [
      // The home is the landing page: keep it in the main bundle.
      { index: true, element: <HomePage /> },
      {
        path: 'podcast/:showId',
        lazy: page(() => import('../features/podcast/podcast-page')),
      },
      {
        path: 'filters',
        lazy: page(() => import('../features/filters/filters-page')),
      },
      {
        path: 'filters/:filterId',
        lazy: page(() => import('../features/filters/smart-list-page')),
      },
      {
        path: 'queue',
        lazy: page(() => import('../features/queue/queue-page')),
      },
      {
        path: 'search',
        lazy: page(() => import('../features/search/search-page')),
      },
      {
        path: 'settings',
        lazy: page(() => import('../features/settings/settings-page')),
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];

/** Vite's BASE_URL ends with "/"; React Router wants it without. */
export const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

export function createAppRouter() {
  return createBrowserRouter(routes, {
    basename,
    future: {
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_relativeSplatPath: true,
      v7_skipActionErrorRevalidation: true,
    },
  });
}
