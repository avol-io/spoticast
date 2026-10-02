import {
  createBrowserRouter,
  Navigate,
  type RouteObject,
} from 'react-router-dom';
import CallbackPage from '../features/auth/callback-page';
import RequireAuth from '../features/auth/require-auth';
import FiltersPage from '../features/filters/filters-page';
import SmartListPage from '../features/filters/smart-list-page';
import HomePage from '../features/home/home-page';
import PodcastPage from '../features/podcast/podcast-page';
import QueuePage from '../features/queue/queue-page';
import SearchPage from '../features/search/search-page';
import SettingsPage from '../features/settings/settings-page';
import AppShell from './shell/app-shell';

export const routes: RouteObject[] = [
  { path: '/callback', element: <CallbackPage /> },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: 'podcast/:showId', element: <PodcastPage /> },
      { path: 'filters', element: <FiltersPage /> },
      { path: 'filters/:filterId', element: <SmartListPage /> },
      { path: 'queue', element: <QueuePage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'settings', element: <SettingsPage /> },
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
