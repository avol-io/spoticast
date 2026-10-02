import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { emptyCriteria } from '../../lib/filters/engine';
import { useFilters } from '../../lib/storage/filters';
import { libraryKeys } from '../library/queries';

import FiltersPage from './filters-page';

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  qc.setQueryData(libraryKeys.savedShows, [
    { added_at: '', show: { id: 's1', name: 'Tech', images: [] } },
  ]);
  qc.setQueryData(libraryKeys.latestEpisodes('s1'), {
    items: [
      {
        id: 'a',
        name: 'A',
        description: '',
        duration_ms: 600_000,
        release_date: '2024-01-01',
        resume_point: { fully_played: false, resume_position_ms: 0 },
      },
    ],
    next: null,
  });
  const router = createMemoryRouter(
    [
      { path: '/filters', element: <FiltersPage /> },
      { path: '/filters/:id', element: <p>detail</p> },
    ],
    { initialEntries: ['/filters'] },
  );
  render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('FiltersPage', () => {
  beforeEach(() => useFilters.setState({ smartLists: [] }));

  it('invites to create the first smart filter', async () => {
    renderPage();
    expect(screen.getByText('No smart filters yet')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'New filter' }));
    expect(
      screen.getByRole('dialog', { name: 'New filter' }),
    ).toBeInTheDocument();
  });

  it('lists smart filters with their summary and episode count', () => {
    useFilters.setState({
      smartLists: [
        {
          id: 'l1',
          name: 'Short',
          criteria: { ...emptyCriteria, maxMinutes: 20 },
          showIds: null,
          includeArchived: false,
          sort: 'newest',
          spotifyPlaylist: true,
          playlistId: null,
          playlistName: null,
        },
      ],
    });
    renderPage();
    const link = screen.getByRole('link', { name: /Short/ });
    expect(link).toHaveAttribute('href', '/filters/l1');
    expect(link).toHaveTextContent('≤ 20 min');
    expect(link).toHaveTextContent('1 episode');
    expect(link).toHaveTextContent('SPOTIFY');
  });
});
