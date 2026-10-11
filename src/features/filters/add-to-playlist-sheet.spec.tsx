import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { queryClient } from '../../lib/query/query-client';
import type { Episode } from '../../lib/spotify/types';
import AddToPlaylistSheet, { openAddToPlaylist } from './add-to-playlist-sheet';
import * as manual from './manual-playlists';
import { manualKeys } from './manual-playlists';

const ep = (id: string) =>
  ({ id, uri: `spotify:episode:${id}`, name: `Episode ${id}` }) as Episode;
const later = { id: 'p1', uri: 'spotify:playlist:p1', name: 'Later' };
const gym = { id: 'p2', uri: 'spotify:playlist:p2', name: 'Gym' };

function renderSheet(episodes: Episode[]) {
  queryClient.setQueryData(manualKeys.all, [later, gym]);
  queryClient.setQueryData(manualKeys.items('p1'), [ep('a')]);
  queryClient.setQueryData(manualKeys.items('p2'), []);
  render(
    <QueryClientProvider client={queryClient}>
      <AddToPlaylistSheet />
    </QueryClientProvider>,
  );
  act(() => openAddToPlaylist(episodes));
}

describe('AddToPlaylistSheet', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  it('marks the playlists that hold the episode and toggles them', async () => {
    const add = vi.spyOn(manual, 'addToManualPlaylist').mockResolvedValue();
    const remove = vi
      .spyOn(manual, 'removeFromManualPlaylist')
      .mockResolvedValue();
    renderSheet([ep('a')]);
    expect(screen.getByText('Episode a')).toBeInTheDocument();
    const inLater = screen.getByRole('button', { name: /Later/ });
    expect(inLater).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(inLater);
    expect(remove).toHaveBeenCalledWith(later, ['spotify:episode:a']);
    await userEvent.click(screen.getByRole('button', { name: /Gym/ }));
    expect(add).toHaveBeenCalledWith(gym, [ep('a')]);
  });

  it('creates a playlist holding the episodes and closes', async () => {
    const create = vi
      .spyOn(manual, 'createManualPlaylist')
      .mockResolvedValue({ id: 'p9', uri: 'spotify:playlist:p9', name: 'New' });
    renderSheet([ep('a'), ep('b')]);
    expect(screen.getByText('2 episodes')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'New playlist' }));
    await userEvent.type(screen.getByLabelText('Name'), 'New');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(create).toHaveBeenCalledWith('New', [ep('a'), ep('b')]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
