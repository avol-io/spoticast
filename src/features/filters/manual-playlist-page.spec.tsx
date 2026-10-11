import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { queryClient } from '../../lib/query/query-client';
import * as controller from '../player/player-controller';
import * as manual from './manual-playlists';
import { manualKeys } from './manual-playlists';

import ManualPlaylistPage from './manual-playlist-page';

const episode = (id: string) => ({
  id,
  uri: `spotify:episode:${id}`,
  type: 'episode',
  name: `Episode ${id}`,
  description: '',
  duration_ms: 600_000,
  release_date: '2024-05-01',
  images: [],
  external_urls: { spotify: '' },
  resume_point: { fully_played: false, resume_position_ms: 0 },
  show: { id: 's1', name: 'Tech', images: [], media_type: 'audio' },
});
const later = { id: 'p1', uri: 'spotify:playlist:p1', name: 'Later' };

function renderPage(id = 'p1') {
  queryClient.setQueryData(manualKeys.all, [later]);
  queryClient.setQueryData(manualKeys.items('p1'), [
    episode('a'),
    episode('b'),
  ]);
  const router = createMemoryRouter(
    [
      { path: '/playlists/m/:playlistId', element: <ManualPlaylistPage /> },
      { path: '/playlists', element: <p>all playlists</p> },
    ],
    { initialEntries: [`/playlists/m/${id}`] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('ManualPlaylistPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  it('lists the episodes and plays them all', async () => {
    const play = vi.spyOn(controller, 'playAll').mockResolvedValue();
    renderPage();
    expect(screen.getByRole('heading', { name: 'Later' })).toBeInTheDocument();
    expect(screen.getByText('2 episodes')).toBeInTheDocument();
    expect(screen.getByText('Episode a')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Play all' }));
    expect(play.mock.calls[0][0].map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('deletes the playlist and goes back to the list', async () => {
    const remove = vi.spyOn(manual, 'deleteManualPlaylist').mockResolvedValue();
    renderPage();
    // The header menu comes before the episode menus.
    await userEvent.click(
      screen.getAllByRole('button', { name: 'More actions' })[0],
    );
    await userEvent.click(
      screen.getByRole('menuitem', { name: 'Delete playlist' }),
    );
    expect(remove).toHaveBeenCalledWith(later);
    expect(await screen.findByText('all playlists')).toBeInTheDocument();
  });

  it('says when the playlist is gone', () => {
    renderPage('missing');
    expect(
      screen.getByText('This playlist no longer exists.'),
    ).toBeInTheDocument();
  });
});
