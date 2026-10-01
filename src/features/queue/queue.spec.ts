import { queryClient } from '../../lib/query/query-client';
import * as endpoints from '../../lib/spotify/endpoints';
import type { Episode } from '../../lib/spotify/types';
import {
  addToQueue,
  ensureQueuePlaylist,
  moveInQueue,
  moveToHead,
  queueKey,
  removeFromQueue,
  resetQueuePlaylistCache,
  type QueueData,
} from './queue';
import { useQueueStore } from './queue-store';

const ep = (id: string) =>
  ({ id, uri: `spotify:episode:${id}`, type: 'episode' }) as Episode;
const uris = () =>
  queryClient.getQueryData<QueueData>(queueKey)?.episodes.map((e) => e.id);

describe('queue', () => {
  beforeEach(() => {
    resetQueuePlaylistCache();
    useQueueStore.setState({ playlistId: 'pl', userId: 'me' });
    vi.spyOn(endpoints, 'libraryContains').mockResolvedValue([true]);
    queryClient.setQueryData<QueueData>(queueKey, {
      episodes: [ep('a'), ep('b'), ep('c')],
      otherCount: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  it('inserts "play next" after the playing head', async () => {
    const add = vi
      .spyOn(endpoints, 'addPlaylistItems')
      .mockResolvedValue({ snapshot_id: 's' });
    await addToQueue(ep('x'), 'next', 'spotify:episode:a');
    expect(add).toHaveBeenCalledWith('pl', ['spotify:episode:x'], 1);
    expect(uris()).toEqual(['a', 'x', 'b', 'c']);
  });

  it('moves an already queued episode to the end for "play last"', async () => {
    const reorder = vi
      .spyOn(endpoints, 'reorderPlaylistItem')
      .mockResolvedValue({ snapshot_id: 's' });
    await addToQueue(ep('a'), 'last');
    expect(reorder).toHaveBeenCalledWith('pl', 0, 3);
    expect(uris()).toEqual(['b', 'c', 'a']);
  });

  it('moves the played episode to the head', async () => {
    const reorder = vi
      .spyOn(endpoints, 'reorderPlaylistItem')
      .mockResolvedValue({ snapshot_id: 's' });
    await moveToHead(ep('c'));
    expect(reorder).toHaveBeenCalledWith('pl', 2, 0);
    expect(uris()).toEqual(['c', 'a', 'b']);
  });

  it('runs writes in order', async () => {
    const calls: string[] = [];
    vi.spyOn(endpoints, 'addPlaylistItems').mockImplementation(
      async (_id, [uri], pos) => {
        await new Promise((r) => setTimeout(r, 5));
        calls.push(`${uri}@${pos}`);
        return { snapshot_id: 's' };
      },
    );
    await Promise.all([
      addToQueue(ep('x'), 'last'),
      addToQueue(ep('y'), 'last'),
    ]);
    expect(calls).toEqual(['spotify:episode:x@3', 'spotify:episode:y@4']);
  });

  it('rolls back when Spotify rejects the change', async () => {
    vi.spyOn(endpoints, 'removePlaylistItems').mockRejectedValue(
      new Error('boom'),
    );
    vi.spyOn(endpoints, 'getPlaylistItems').mockResolvedValue([]);
    await expect(removeFromQueue('spotify:episode:b')).rejects.toThrow('boom');
    expect(uris()).toEqual(['a', 'b', 'c']);
  });

  it('reorders with Spotify insert-before semantics', async () => {
    const reorder = vi
      .spyOn(endpoints, 'reorderPlaylistItem')
      .mockResolvedValue({ snapshot_id: 's' });
    await moveInQueue(0, 2);
    expect(reorder).toHaveBeenCalledWith('pl', 0, 3);
    expect(uris()).toEqual(['b', 'c', 'a']);
  });
});

describe('ensureQueuePlaylist', () => {
  beforeEach(() => {
    resetQueuePlaylistCache();
    useQueueStore.setState({ playlistId: null, userId: null });
  });
  afterEach(() => vi.restoreAllMocks());

  it('reuses an existing "Spoticast" playlist owned by the user', async () => {
    vi.spyOn(endpoints, 'getMe').mockResolvedValue({ id: 'me' } as never);
    vi.spyOn(endpoints, 'getMyPlaylists').mockResolvedValue([
      { id: 'other', name: 'Spoticast', owner: { id: 'someone' } },
      { id: 'mine', name: 'Spoticast', owner: { id: 'me' } },
    ] as never);
    const create = vi.spyOn(endpoints, 'createPlaylist');
    expect(await ensureQueuePlaylist()).toBe('mine');
    expect(create).not.toHaveBeenCalled();
    expect(useQueueStore.getState().playlistId).toBe('mine');
  });

  it('creates it once when missing', async () => {
    vi.spyOn(endpoints, 'getMe').mockResolvedValue({ id: 'me' } as never);
    vi.spyOn(endpoints, 'getMyPlaylists').mockResolvedValue([]);
    const create = vi
      .spyOn(endpoints, 'createPlaylist')
      .mockResolvedValue({ id: 'new' } as never);
    const [a, b] = await Promise.all([
      ensureQueuePlaylist(),
      ensureQueuePlaylist(),
    ]);
    expect([a, b]).toEqual(['new', 'new']);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith('Spoticast', expect.any(String));
  });

  it('follows the stored playlist again if the user removed it', async () => {
    useQueueStore.setState({ playlistId: 'kept', userId: 'me' });
    vi.spyOn(endpoints, 'libraryContains').mockResolvedValue([false]);
    const save = vi.spyOn(endpoints, 'saveToLibrary').mockResolvedValue();
    expect(await ensureQueuePlaylist()).toBe('kept');
    expect(save).toHaveBeenCalledWith(['spotify:playlist:kept']);
  });
});
