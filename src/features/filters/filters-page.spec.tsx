import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { emptyCriteria } from '../../lib/filters/engine';
import { useFilters } from '../../lib/storage/filters';
import { libraryKeys } from '../library/queries';
import * as controller from '../player/player-controller';

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
      { path: '/playlists', element: <FiltersPage /> },
      { path: '/playlists/:id', element: <p>detail</p> },
    ],
    { initialEntries: ['/playlists'] },
  );
  render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('FiltersPage', () => {
  beforeEach(() => useFilters.setState({ smartLists: [] }));

  it('invites to create the first smart playlist', async () => {
    renderPage();
    expect(screen.getByText('No smart playlists yet')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'New playlist' }));
    expect(
      screen.getByRole('dialog', { name: 'New playlist' }),
    ).toBeInTheDocument();
  });

  it('lists smart playlists with their summary and episode count', async () => {
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
          playlistDescription: null,
          updatedAt: 0,
        },
      ],
    });
    renderPage();
    const link = screen.getByRole('link', { name: /Short/ });
    expect(link).toHaveAttribute('href', '/playlists/l1');
    expect(link).toHaveTextContent('≤ 20 min');
    expect(link).toHaveTextContent('1 episode');
    expect(link).toHaveTextContent('SPOTIFY');
    const play = vi.spyOn(controller, 'playAll').mockResolvedValue();
    await userEvent.click(screen.getByRole('button', { name: 'Play Short' }));
    expect(play.mock.calls[0][0]).toHaveLength(1);
    play.mockRestore();
  });
});
