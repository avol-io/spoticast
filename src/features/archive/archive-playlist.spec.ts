import * as endpoints from '../../lib/spotify/endpoints';
import type {
  Episode,
  PlaylistItem,
  SimplifiedEpisode,
  SimplifiedPlaylist,
} from '../../lib/spotify/types';
import {
  ARCHIVE_DESCRIPTION,
  ensureArchivePlaylist,
  flushArchive,
  resetArchivePlaylistCache,
  syncArchive,
} from './archive-playlist';
import { useArchiveStore } from './archive-store';

const ep = (id: string, played = false) =>
  ({
    id,
    uri: `spotify:episode:${id}`,
    type: 'episode',
    name: id,
    duration_ms: 1000,
    resume_point: { fully_played: played, resume_position_ms: 0 },
  }) as Episode;
const item = (episode: Episode): PlaylistItem => ({
  added_at: '2026-01-01T00:00:00Z',
  is_local: false,
  item: episode,
});
const playlist = (id: string, description: string, owner = 'me') =>
  ({
    id,
    name: 'whatever',
    description,
    owner: { id: owner, display_name: null },
  }) as SimplifiedPlaylist;

describe('archive playlist', () => {
  beforeEach(() => {
    resetArchivePlaylistCache();
    useArchiveStore.setState({
      pending: {},
      removed: {},
      restored: {},
      playlistId: 'arc',
    });
    vi.spyOn(endpoints, 'libraryContains').mockResolvedValue([true]);
  });

  afterEach(() => vi.restoreAllMocks());

  it('finds the playlist by its marker, else creates it', async () => {
    useArchiveStore.setState({ playlistId: null });
    vi.spyOn(endpoints, 'getMe').mockResolvedValue({ id: 'me' } as never);
    vi.spyOn(endpoints, 'getMyPlaylists').mockResolvedValue([
      playlist('other', ARCHIVE_DESCRIPTION, 'someone'),
      playlist('mine', `Renamed · ${ARCHIVE_DESCRIPTION}`),
    ]);
    expect(await ensureArchivePlaylist()).toBe('mine');
    expect(useArchiveStore.getState().playlistId).toBe('mine');

    resetArchivePlaylistCache();
    useArchiveStore.setState({ playlistId: null });
    vi.spyOn(endpoints, 'getMyPlaylists').mockResolvedValue([]);
    const create = vi
      .spyOn(endpoints, 'createPlaylist')
      .mockResolvedValue(playlist('new', ARCHIVE_DESCRIPTION));
    expect(await ensureArchivePlaylist()).toBe('new');
    expect(create).toHaveBeenCalledWith(
      'Spoticast · Archive',
      ARCHIVE_DESCRIPTION,
    );
  });

  it('writes removals, then additions', async () => {
    const calls: string[] = [];
    vi.spyOn(endpoints, 'removePlaylistItems').mockImplementation(
      async (_id, uris) => {
        calls.push(`remove ${uris.join()}`);
        return { snapshot_id: 's' };
      },
    );
    vi.spyOn(endpoints, 'addPlaylistItems').mockImplementation(
      async (_id, uris) => {
        calls.push(`add ${uris.join()}`);
        return { snapshot_id: 's' };
      },
    );
    const { archive, restore } = useArchiveStore.getState();
    archive(ep('a') as SimplifiedEpisode);
    useArchiveStore.setState({ removed: { b: 'spotify:episode:b' } });
    restore(ep('c') as SimplifiedEpisode);

    await flushArchive();
    expect(calls).toEqual([
      'remove spotify:episode:b',
      'add spotify:episode:a',
    ]);
    const state = useArchiveStore.getState();
    expect(state.removed).toEqual({});
    expect(state.pending.a.sharedAt).not.toBeNull();
  });

  it('keeps unsent changes when Spotify is out of reach', async () => {
    vi.spyOn(endpoints, 'addPlaylistItems').mockRejectedValue(
      new Error('offline'),
    );
    useArchiveStore.getState().archive(ep('a') as SimplifiedEpisode);
    await expect(flushArchive()).rejects.toThrow('offline');
    expect(useArchiveStore.getState().pending.a.sharedAt).toBeNull();
  });

  it('picks up the archive of other devices and drops completed episodes', async () => {
    vi.spyOn(endpoints, 'getPlaylistItems').mockResolvedValue([
      item(ep('other')),
      item(ep('played', true)),
    ]);
    const remove = vi
      .spyOn(endpoints, 'removePlaylistItems')
      .mockResolvedValue({ snapshot_id: 's' });
    await syncArchive();
    const state = useArchiveStore.getState();
    expect(Object.keys(state.pending)).toEqual(['other']);
    expect(remove).toHaveBeenCalledWith('arc', ['spotify:episode:played']);
    expect(state.removed).toEqual({});
  });
});
