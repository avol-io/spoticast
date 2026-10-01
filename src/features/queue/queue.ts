import { useQuery } from '@tanstack/react-query';
import i18n from '../../i18n';
import { queryClient } from '../../lib/query/query-client';
import { SpotifyApiError } from '../../lib/spotify/client';
import {
  addPlaylistItems,
  createPlaylist,
  getMe,
  getMyPlaylists,
  getPlaylistItems,
  libraryContains,
  removePlaylistItems,
  reorderPlaylistItem,
  saveToLibrary,
} from '../../lib/spotify/endpoints';
import type { Episode } from '../../lib/spotify/types';
import { toast } from '../../lib/storage/toasts';
import { applyMove, moveRequest, playNextPosition } from './queue-logic';
import { QUEUE_PLAYLIST_NAME, useQueueStore } from './queue-store';

export interface QueueData {
  episodes: Episode[];
  /** Songs added to the playlist from other apps: kept, but not shown. */
  otherCount: number;
}

export const queueKey = ['queue'] as const;

let ensuring: Promise<string> | null = null;

/** Finds or creates the user's private "Spoticast" playlist (once per session). */
export function ensureQueuePlaylist(): Promise<string> {
  ensuring ??= (async () => {
    const { playlistId, setPlaylist } = useQueueStore.getState();
    if (playlistId) {
      const uri = `spotify:playlist:${playlistId}`;
      try {
        // A "deleted" playlist is only unfollowed: follow it again.
        const [followed] = await libraryContains([uri]);
        if (!followed) await saveToLibrary([uri]);
        return playlistId;
      } catch (error) {
        if (!(error instanceof SpotifyApiError && error.status === 404))
          throw error;
      }
    }
    const me = await getMe();
    const existing = (await getMyPlaylists()).find(
      (p) => p.name === QUEUE_PLAYLIST_NAME && p.owner.id === me.id,
    );
    const playlist =
      existing ??
      (await createPlaylist(
        QUEUE_PLAYLIST_NAME,
        'Up Next · managed by Spoticast',
      ));
    setPlaylist(playlist.id, me.id);
    return playlist.id;
  })().catch((error) => {
    ensuring = null;
    throw error;
  });
  return ensuring;
}

/** Test hook: forget the memoized playlist lookup. */
export function resetQueuePlaylistCache() {
  ensuring = null;
}

export async function loadQueue(signal?: AbortSignal): Promise<QueueData> {
  const id = await ensureQueuePlaylist();
  const items = await getPlaylistItems(id, signal);
  const episodes = items
    .map((entry) => entry.item)
    .filter((item): item is Episode => item?.type === 'episode');
  return { episodes, otherCount: items.length - episodes.length };
}

export function useQueue() {
  return useQuery({
    queryKey: queueKey,
    queryFn: ({ signal }) => loadQueue(signal),
    staleTime: 30_000,
  });
}

export function useIsInQueue(uri: string): boolean {
  const { data } = useQueue();
  return !!data?.episodes.some((ep) => ep.uri === uri);
}

async function currentQueue(): Promise<QueueData> {
  return (
    queryClient.getQueryData<QueueData>(queueKey) ??
    queryClient.fetchQuery({ queryKey: queueKey, queryFn: () => loadQueue() })
  );
}

function setQueue(update: (episodes: Episode[]) => Episode[]) {
  queryClient.setQueryData<QueueData>(queueKey, (data) =>
    data ? { ...data, episodes: update(data.episodes) } : data,
  );
}

// Positions depend on the previous operation: run queue writes one at a time.
let chain: Promise<unknown> = Promise.resolve();

function serial<T>(operation: () => Promise<T>): Promise<T> {
  const run = chain.then(operation, operation);
  chain = run.catch(() => undefined);
  return run;
}

/** Applies an optimistic change, rolls it back and resyncs on failure. */
async function mutate(
  optimistic: (episodes: Episode[]) => Episode[],
  write: (playlistId: string) => Promise<unknown>,
) {
  const playlistId = await ensureQueuePlaylist();
  const previous = queryClient.getQueryData<QueueData>(queueKey);
  setQueue(optimistic);
  try {
    await write(playlistId);
  } catch (error) {
    queryClient.setQueryData(queueKey, previous);
    void queryClient.invalidateQueries({ queryKey: queueKey });
    toast(i18n.t('errors.generic'), { tone: 'error' });
    throw error;
  }
}

/** Moves (or inserts) an episode to `target`, keeping a single copy. */
async function placeAt(episode: Episode, target: number) {
  const { episodes } = await currentQueue();
  const index = episodes.findIndex((ep) => ep.uri === episode.uri);
  if (index === target) return;
  if (index === -1) {
    await mutate(
      (list) => [...list.slice(0, target), episode, ...list.slice(target)],
      (id) => addPlaylistItems(id, [episode.uri], target),
    );
    return;
  }
  const to = Math.min(target, episodes.length - 1);
  const { rangeStart, insertBefore } = moveRequest(index, to);
  await mutate(
    (list) => applyMove(list, index, to),
    (id) => reorderPlaylistItem(id, rangeStart, insertBefore),
  );
}

export function addToQueue(
  episode: Episode,
  where: 'next' | 'last',
  nowPlayingUri?: string,
) {
  return serial(async () => {
    const { episodes } = await currentQueue();
    if (where === 'next') {
      await placeAt(
        episode,
        playNextPosition(
          episodes.map((ep) => ep.uri),
          nowPlayingUri,
        ),
      );
    } else {
      const inQueue = episodes.some((ep) => ep.uri === episode.uri);
      await placeAt(episode, inQueue ? episodes.length - 1 : episodes.length);
    }
    toast(i18n.t(where === 'next' ? 'episode.addedNext' : 'episode.addedLast'));
  });
}

/** Puts the episode at the head of Up Next (before playing it). */
export function moveToHead(episode: Episode) {
  return serial(() => placeAt(episode, 0));
}

export function removeFromQueue(uri: string, { silent = false } = {}) {
  return serial(async () => {
    const { episodes } = await currentQueue();
    if (!episodes.some((ep) => ep.uri === uri)) return;
    await mutate(
      (list) => list.filter((ep) => ep.uri !== uri),
      (id) => removePlaylistItems(id, [uri]),
    );
    if (!silent) toast(i18n.t('episode.removedFromQueue'));
  });
}

export function moveInQueue(from: number, to: number) {
  return serial(async () => {
    if (from === to) return;
    const { rangeStart, insertBefore } = moveRequest(from, to);
    await mutate(
      (list) => applyMove(list, from, to),
      (id) => reorderPlaylistItem(id, rangeStart, insertBefore),
    );
  });
}

/** Startup cleanup: drop episodes Spotify reports as completed. */
export async function pruneFinishedFromQueue() {
  const { episodes } = await currentQueue();
  const finished = episodes
    .filter((ep) => ep.resume_point?.fully_played)
    .map((ep) => ep.uri);
  if (finished.length === 0) return;
  await serial(() =>
    mutate(
      (list) => list.filter((ep) => !finished.includes(ep.uri)),
      (id) => removePlaylistItems(id, finished),
    ),
  );
}

export function playlistUri(): string | null {
  const id = useQueueStore.getState().playlistId;
  return id ? `spotify:playlist:${id}` : null;
}
