import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { libraryKeys } from '../library/queries';

import HomePage from './home-page';

function renderHome(qc: QueryClient) {
  const router = createMemoryRouter([{ path: '/', element: <HomePage /> }]);
  render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

const cachedClient = () =>
  new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });

describe('HomePage', () => {
  it('shows followed podcasts with unplayed badges', () => {
    const qc = cachedClient();
    qc.setQueryData(libraryKeys.savedShows, [
      {
        added_at: '2024-01-01T00:00:00Z',
        show: { id: 's1', name: 'Daily News', images: [] },
      },
    ]);
    qc.setQueryData(libraryKeys.latestEpisodes('s1'), {
      items: [
        {
          id: 'e1',
          release_date: '2024-05-01',
          resume_point: { fully_played: false, resume_position_ms: 0 },
        },
        {
          id: 'e2',
          release_date: '2024-04-01',
          resume_point: { fully_played: true, resume_position_ms: 0 },
        },
      ],
      next: null,
    });
    renderHome(qc);
    expect(
      screen.getByRole('link', { name: 'Daily News, 1 episode to listen to' }),
    ).toBeInTheDocument();
  });

  it('suggests search when nothing is followed', () => {
    const qc = cachedClient();
    qc.setQueryData(libraryKeys.savedShows, []);
    renderHome(qc);
    expect(
      screen.getByText("You don't follow any podcast yet"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Search podcasts' }),
    ).toHaveAttribute('href', '/search');
  });
});
