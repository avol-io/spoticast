import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { emptyCriteria } from '../../lib/filters/engine';
import { useFilters } from '../../lib/storage/filters';
import { libraryKeys } from '../library/queries';
import * as controller from '../player/player-controller';
import * as manual from './manual-playlists';
import { manualKeys } from './manual-playlists';

import FiltersPage from './filters-page';

function renderPage(playlists: manual.ManualPlaylist[] = []) {
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
  qc.setQueryData(manualKeys.all, playlists);
  for (const p of playlists) qc.setQueryData(manualKeys.items(p.id), []);
  const router = createMemoryRouter(
    [
      { path: '/playlists', element: <FiltersPage /> },
      { path: '/playlists/:id', element: <p>detail</p> },
      { path: '/playlists/m/:id', element: <p>manual detail</p> },
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

  afterEach(() => vi.restoreAllMocks());

  it('invites to create the first playlist of either kind', async () => {
    renderPage();
    expect(screen.getByText('No playlists yet')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'New smart playlist' }),
    );
    expect(
      screen.getByRole('dialog', { name: 'New smart playlist' }),
    ).toBeInTheDocument();
  });

  it('creates a playlist and opens it', async () => {
    const create = vi.spyOn(manual, 'createManualPlaylist').mockResolvedValue({
      id: 'p9',
      uri: 'spotify:playlist:p9',
      name: 'Later',
    });
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'New playlist' }));
    await userEvent.type(screen.getByLabelText('Name'), 'Later');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(create).toHaveBeenCalledWith('Later');
    expect(await screen.findByText('manual detail')).toBeInTheDocument();
  });

  it('lists manual playlists with their episode count', () => {
    renderPage([{ id: 'p1', uri: 'spotify:playlist:p1', name: 'Later' }]);
    const link = screen.getByRole('link', { name: /Later/ });
    expect(link).toHaveAttribute('href', '/playlists/m/p1');
    expect(link).toHaveTextContent('0 episodes');
    expect(screen.getByText('Smart playlists')).toBeInTheDocument();
  });

  it('lists smart playlists with their summary and episode count', async () => {
    useFilters.setState({
      smartLists: [
        {
          id: 'l1',
          name: 'Short',
          criteria: { ...emptyCriteria, maxMinutes: 20 },
          showIds: null,
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
