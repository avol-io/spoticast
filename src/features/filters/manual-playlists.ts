import { useQueries, useQuery } from '@tanstack/react-query';
import i18n from '../../i18n';
import { queryClient } from '../../lib/query/query-client';
import {
  addPlaylistItems,
  createPlaylist,
  getMyPlaylists,
  getPlaylistItems,
  removeFromLibrary,
  removePlaylistItems,
  updatePlaylistDetails,
} from '../../lib/spotify/endpoints';
import type { Episode, SimplifiedPlaylist } from '../../lib/spotify/types';
import { toast } from '../../lib/storage/toasts';
import { currentUserId, listName, playlistName } from './smart-lists';

/**
 * Playlists the user fills by hand: "Spoticast - <name>" on Spotify, told
 * apart from smart playlists (`sc1:`) and Up Next by this description.
 */
export const MANUAL_DESCRIPTION = 'Spoticast playlist · scm1';
const MARKER = 'scm1';

export interface ManualPlaylist {
  id: string;
  uri: string;
  /** Name without the "Spoticast - " prefix. */
  name: string;
}

export const manualKeys = {
  all: ['manual-playlists'] as const,
  items: (id: string) => ['manual-playlists', id] as const,
};

export const isManualPlaylist = (playlist: SimplifiedPlaylist, me: string) =>
  playlist.owner.id === me && !!playlist.description?.includes(MARKER);

const toManual = (playlist: SimplifiedPlaylist): ManualPlaylist => ({
  id: playlist.id,
  uri: playlist.uri,
  name: listName(playlist.name, playlist.name),
});

// /me/playlists can lag behind an unfollow: hide what was deleted here.
const deleted = new Set<string>();

async function loadPlaylists(signal?: AbortSignal): Promise<ManualPlaylist[]> {
  const [me, playlists] = await Promise.all([
    currentUserId(),
    getMyPlaylists(signal),
  ]);
  return playlists
    .filter((p) => isManualPlaylist(p, me) && !deleted.has(p.id))
    .map(toManual);
}

async function loadItems(id: string, signal?: AbortSignal): Promise<Episode[]> {
  const items = await getPlaylistItems(id, signal);
  return items
    .map((entry) => entry.item)
    .filter((item): item is Episode => item?.type === 'episode');
}

const itemsQuery = (id: string) => ({
  queryKey: manualKeys.items(id),
  queryFn: ({ signal }: { signal?: AbortSignal }) => loadItems(id, signal),
  staleTime: 30_000,
});

export function useManualPlaylists() {
  return useQuery({
    queryKey: manualKeys.all,
    queryFn: ({ signal }) => loadPlaylists(signal),
    staleTime: 60_000,
  });
}

export function useManualPlaylistEpisodes(id: string) {
  return useQuery(itemsQuery(id));
}

/** Episodes of several playlists at once (membership checks). */
export function useManualPlaylistsEpisodes(ids: string[]) {
  return useQueries({ queries: ids.map(itemsQuery) });
}

// Writes to a playlist depend on what it holds: run them one at a time.
const chains = new Map<string, Promise<unknown>>();

function serial<T>(id: string, operation: () => Promise<T>): Promise<T> {
  const chain = chains.get(id) ?? Promise.resolve();
  const run = chain.then(operation, operation);
  chains.set(
    id,
    run.catch(() => undefined),
  );
  return run;
}

const currentItems = (id: string) =>
  queryClient.getQueryData<Episode[]>(manualKeys.items(id)) ??
  queryClient.fetchQuery(itemsQuery(id));

/** Applies an optimistic change, rolls it back and resyncs on failure. */
async function mutate(
  id: string,
  optimistic: (episodes: Episode[]) => Episode[],
  write: () => Promise<unknown>,
) {
  const key = manualKeys.items(id);
  await queryClient.cancelQueries({ queryKey: key });
  const previous = queryClient.getQueryData<Episode[]>(key);
  queryClient.setQueryData<Episode[]>(key, (list = []) => optimistic(list));
  try {
    await write();
  } catch (error) {
    queryClient.setQueryData(key, previous);
    void queryClient.invalidateQueries({ queryKey: key });
    toast(i18n.t('errors.generic'), { tone: 'error' });
    throw error;
  }
}

/** Appends the episodes the playlist doesn't hold yet. */
export function addToManualPlaylist(
  playlist: ManualPlaylist,
  episodes: Episode[],
): Promise<void> {
  return serial(playlist.id, async () => {
    const have = new Set((await currentItems(playlist.id)).map((ep) => ep.uri));
    const fresh = episodes.filter(
      (ep, i) =>
        !have.has(ep.uri) &&
        episodes.findIndex((other) => other.uri === ep.uri) === i,
    );
    if (fresh.length === 0) {
      toast(i18n.t('playlists.alreadyIn', { name: playlist.name }));
      return;
    }
    await mutate(
      playlist.id,
      (list) => [...list, ...fresh],
      () =>
        addPlaylistItems(
          playlist.id,
          fresh.map((ep) => ep.uri),
        ),
    );
    toast(
      i18n.t('playlists.added', { count: fresh.length, name: playlist.name }),
    );
  });
}

export function removeFromManualPlaylist(
  playlist: ManualPlaylist,
  uris: string[],
): Promise<void> {
  const gone = new Set(uris);
  return serial(playlist.id, async () => {
    await mutate(
      playlist.id,
      (list) => list.filter((ep) => !gone.has(ep.uri)),
      () => removePlaylistItems(playlist.id, uris),
    );
    toast(
      i18n.t('playlists.removed', { count: gone.size, name: playlist.name }),
    );
  });
}

const setPlaylists = (update: (list: ManualPlaylist[]) => ManualPlaylist[]) =>
  queryClient.setQueryData<ManualPlaylist[]>(manualKeys.all, (list) =>
    list ? update(list) : list,
  );

/** Creates a playlist, optionally with its first episodes. */
export async function createManualPlaylist(
  name: string,
  episodes: Episode[] = [],
): Promise<ManualPlaylist> {
  const created = await createPlaylist(
    playlistName({ name }),
    MANUAL_DESCRIPTION,
  );
  const playlist: ManualPlaylist = { id: created.id, uri: created.uri, name };
  setPlaylists((list) => [...list, playlist]);
  queryClient.setQueryData<Episode[]>(manualKeys.items(playlist.id), []);
  // A failed add is reported on its own: the playlist exists anyway.
  if (episodes.length)
    await addToManualPlaylist(playlist, episodes).catch(() => undefined);
  return playlist;
}

export async function renameManualPlaylist(
  playlist: ManualPlaylist,
  name: string,
): Promise<void> {
  await updatePlaylistDetails(playlist.id, { name: playlistName({ name }) });
  setPlaylists((list) =>
    list.map((p) => (p.id === playlist.id ? { ...p, name } : p)),
  );
}

/** Removes ("unfollows") the playlist on Spotify. */
export async function deleteManualPlaylist(
  playlist: ManualPlaylist,
): Promise<void> {
  await removeFromLibrary([playlist.uri]);
  deleted.add(playlist.id);
  setPlaylists((list) => list.filter((p) => p.id !== playlist.id));
  queryClient.removeQueries({ queryKey: manualKeys.items(playlist.id) });
}
