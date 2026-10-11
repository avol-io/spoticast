import { queryClient } from '../../lib/query/query-client';
import { decodeDescription } from '../../lib/filters/smart-list-codec';
import * as endpoints from '../../lib/spotify/endpoints';
import type { Episode, SimplifiedPlaylist } from '../../lib/spotify/types';
import { useToasts } from '../../lib/storage/toasts';
import {
  MANUAL_DESCRIPTION,
  addToManualPlaylist,
  createManualPlaylist,
  deleteManualPlaylist,
  manualKeys,
  removeFromManualPlaylist,
  useManualPlaylists,
  type ManualPlaylist,
} from './manual-playlists';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const ep = (id: string) =>
  ({ id, uri: `spotify:episode:${id}`, type: 'episode' }) as Episode;
const later: ManualPlaylist = {
  id: 'p1',
  uri: 'spotify:playlist:p1',
  name: 'Later',
};
const held = () =>
  queryClient.getQueryData<Episode[]>(manualKeys.items('p1'))?.map((e) => e.id);
const lastToast = () => useToasts.getState().toasts.slice(-1)[0]?.message;
const remote = (id: string, name: string, description: string, owner = 'me') =>
  ({
    id,
    uri: `spotify:playlist:${id}`,
    name,
    description,
    owner: { id: owner, display_name: null },
  }) as SimplifiedPlaylist;

describe('manual playlists', () => {
  beforeEach(() => {
    vi.spyOn(endpoints, 'getMe').mockResolvedValue({ id: 'me' } as never);
    queryClient.setQueryData(manualKeys.all, [later]);
    queryClient.setQueryData(manualKeys.items('p1'), [ep('a')]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
    useToasts.setState({ toasts: [] });
  });

  it('is not mistaken for a smart playlist', () => {
    expect(decodeDescription(MANUAL_DESCRIPTION).kind).toBe('none');
  });

  it('lists only the playlists marked as manual and owned by the user', async () => {
    vi.spyOn(endpoints, 'getMyPlaylists').mockResolvedValue([
      remote('p1', 'Spoticast - Later', MANUAL_DESCRIPTION),
      remote('p2', 'Spoticast - Short', 'Spoticast smart playlist · sc1:x'),
      remote('p3', 'Spoticast', 'Up Next · managed by Spoticast'),
      remote('p4', 'Spoticast - Theirs', MANUAL_DESCRIPTION, 'someone'),
    ]);
    queryClient.clear();
    const { result } = renderHook(() => useManualPlaylists(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });
    await waitFor(() => expect(result.current.data).toEqual([later]));
  });

  it('adds only the episodes it does not hold yet', async () => {
    const add = vi
      .spyOn(endpoints, 'addPlaylistItems')
      .mockResolvedValue({ snapshot_id: 's' });
    await addToManualPlaylist(later, [ep('a'), ep('b'), ep('b')]);
    expect(add).toHaveBeenCalledWith('p1', ['spotify:episode:b']);
    expect(held()).toEqual(['a', 'b']);
    expect(lastToast()).toBe('Added to “Later”');
  });

  it('skips the write when every episode is already there', async () => {
    const add = vi.spyOn(endpoints, 'addPlaylistItems');
    await addToManualPlaylist(later, [ep('a')]);
    expect(add).not.toHaveBeenCalled();
    expect(lastToast()).toBe('Already in “Later”');
  });

  it('rolls back a failed removal', async () => {
    vi.spyOn(endpoints, 'removePlaylistItems').mockRejectedValue(
      new Error('offline'),
    );
    vi.spyOn(endpoints, 'getPlaylistItems').mockResolvedValue([
      { added_at: null, is_local: false, item: ep('a') },
    ]);
    await expect(
      removeFromManualPlaylist(later, ['spotify:episode:a']),
    ).rejects.toThrow('offline');
    expect(held()).toEqual(['a']);
  });

  it('creates a playlist with its first episodes', async () => {
    const create = vi
      .spyOn(endpoints, 'createPlaylist')
      .mockResolvedValue(remote('p9', 'Spoticast - New', MANUAL_DESCRIPTION));
    const add = vi
      .spyOn(endpoints, 'addPlaylistItems')
      .mockResolvedValue({ snapshot_id: 's' });
    const playlist = await createManualPlaylist('New', [ep('x')]);
    expect(create).toHaveBeenCalledWith('Spoticast - New', MANUAL_DESCRIPTION);
    expect(add).toHaveBeenCalledWith('p9', ['spotify:episode:x']);
    expect(queryClient.getQueryData(manualKeys.all)).toEqual([later, playlist]);
  });

  it('unfollows a deleted playlist and keeps it hidden', async () => {
    const unfollow = vi
      .spyOn(endpoints, 'removeFromLibrary')
      .mockResolvedValue();
    await deleteManualPlaylist(later);
    expect(unfollow).toHaveBeenCalledWith(['spotify:playlist:p1']);
    expect(queryClient.getQueryData(manualKeys.all)).toEqual([]);
  });
});
