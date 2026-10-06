import { CancelledError, type FetchQueryOptions } from '@tanstack/react-query';
import { useMemo } from 'react';
import i18n from '../../i18n';
import { matchesCriteria, sortEpisodes } from '../../lib/filters/engine';
import { queryClient } from '../../lib/query/query-client';
import {
  createPlaylist,
  getMe,
  getMyPlaylists,
  getSavedShows,
  getShowEpisodes,
  libraryContains,
  removeFromLibrary,
  replacePlaylistItems,
  saveToLibrary,
  updatePlaylistDetails,
} from '../../lib/spotify/endpoints';
import type {
  Episode,
  Paging,
  SavedShow,
  SimplifiedEpisode,
  SimplifiedPlaylist,
  SimplifiedShow,
} from '../../lib/spotify/types';
import {
  decodeDescription,
  describeSmartList,
  resolveShowIds,
  shouldWriteDescription,
} from '../../lib/filters/smart-list-codec';
import {
  newSmartListId,
  useFilters,
  type SmartList,
} from '../../lib/storage/filters';
import { toast } from '../../lib/storage/toasts';
import { isArchivedIn, useArchiveStore } from '../archive/archive-store';
import { useIsArchived } from '../archive/use-archive';
import {
  libraryKeys,
  useLatestEpisodes,
  useSavedShows,
} from '../library/queries';

export const SMART_PLAYLIST_PREFIX = 'Spoticast - ';

/** Episodes of a smart list, newest page of each selected show. */
export function selectSmartEpisodes(
  list: Pick<SmartList, 'criteria' | 'showIds' | 'includeArchived' | 'sort'>,
  shows: SimplifiedShow[],
  pages: (Paging<SimplifiedEpisode> | undefined)[],
  isArchived: (episode: SimplifiedEpisode) => boolean,
  now = new Date(),
): Episode[] {
  const items = shows.flatMap((show, i) =>
    (pages[i]?.items ?? [])
      .filter(
        (episode) => episode && (list.includeArchived || !isArchived(episode)),
      )
      .filter((episode) =>
        matchesCriteria(episode, list.criteria, { show, now }),
      )
      .map((episode) => ({ episode: { ...episode, show } as Episode })),
  );
  return sortEpisodes(items, list.sort).map((item) => item.episode);
}

const selectShows = (saved: SavedShow[], showIds: string[] | null) =>
  saved
    .map((s) => s.show)
    .filter((show) => !showIds || showIds.includes(show.id));

/** Live episodes of a smart list for the UI. */
export function useSmartListEpisodes(list: SmartList | undefined) {
  const saved = useSavedShows();
  const shows = useMemo(
    () => (list ? selectShows(saved.data ?? [], list.showIds) : []),
    [saved.data, list],
  );
  const pages = useLatestEpisodes(shows.map((s) => s.id));
  const isArchived = useIsArchived();
  const loading = saved.isPending || pages.some((p) => p.isPending);
  const episodes = list
    ? selectSmartEpisodes(
        list,
        shows,
        pages.map((p) => p.data),
        isArchived,
      )
    : [];
  return { episodes, loading };
}

/**
 * fetchQuery shares in-flight requests with the UI; when the screen that
 * started one unmounts, React Query cancels it. Retry instead of failing.
 */
async function fetchShared<T>(
  options: FetchQueryOptions<T, Error, T, readonly unknown[]>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await queryClient.fetchQuery(options);
    } catch (error) {
      if (!(error instanceof CancelledError) || attempt >= 2) throw error;
    }
  }
}

const savedShows = () =>
  fetchShared({
    queryKey: libraryKeys.savedShows,
    queryFn: ({ signal }) => getSavedShows(signal),
    staleTime: 5 * 60_000,
  });

async function computeEpisodes(list: SmartList): Promise<Episode[]> {
  const shows = selectShows(await savedShows(), list.showIds);
  const pages = await Promise.all(
    shows.map((show) =>
      fetchShared({
        queryKey: libraryKeys.latestEpisodes(show.id),
        queryFn: ({ signal }) => getShowEpisodes(show.id, 0, signal),
        staleTime: 10 * 60_000,
      }),
    ),
  );
  const archive = useArchiveStore.getState();
  return selectSmartEpisodes(list, shows, pages, (ep) =>
    isArchivedIn(ep, archive),
  );
}

let meId: Promise<string> | null = null;
const currentUserId = () => (meId ??= getMe().then((me) => me.id));

const playlistName = (list: Pick<SmartList, 'name'>) =>
  `${SMART_PLAYLIST_PREFIX}${list.name}`;

/** List name from a playlist name, which can be renamed in Spotify. */
const listName = (name: string, fallback: string) =>
  (name.startsWith(SMART_PLAYLIST_PREFIX)
    ? name.slice(SMART_PLAYLIST_PREFIX.length)
    : name
  ).trim() || fallback;

/**
 * Finds, creates or re-follows the list's playlist and keeps its name and
 * synced description up to date.
 */
async function ensureSmartPlaylist(list: SmartList): Promise<string> {
  const name = playlistName(list);
  const description = describeSmartList(list);
  let id = list.playlistId;
  let current = {
    name: list.playlistName,
    description: list.playlistDescription,
  };
  if (id) {
    const [followed] = await libraryContains([`spotify:playlist:${id}`]);
    if (!followed) await saveToLibrary([`spotify:playlist:${id}`]);
  } else {
    const me = await currentUserId();
    const existing = (await getMyPlaylists()).find(
      (p) => p.name === name && p.owner.id === me,
    );
    id = existing?.id ?? (await createPlaylist(name, description)).id;
    current = existing ?? { name, description };
  }
  const details = {
    ...(current.name !== name && { name }),
    ...(shouldWriteDescription(list, current.description) && { description }),
  };
  if (details.name || details.description)
    await updatePlaylistDetails(id, details);
  useFilters
    .getState()
    .setSmartPlaylist(
      list.id,
      id,
      name,
      details.description ?? current.description,
    );
  return id;
}

/** Empties and refills the Spotify playlist of a smart list. */
export async function syncSmartPlaylist(list: SmartList): Promise<void> {
  if (!list.spotifyPlaylist) return;
  const [id, episodes] = await Promise.all([
    ensureSmartPlaylist(list),
    computeEpisodes(list),
  ]);
  await replacePlaylistItems(
    id,
    episodes.map((ep) => ep.uri),
  );
}

/** Merges the copy of a list found on Spotify, newest edit wins. */
function mergeRemote(
  local: SmartList,
  remote: SimplifiedPlaylist,
  shows: SimplifiedShow[],
): SmartList {
  const linked = {
    ...local,
    showIds: resolveShowIds(local.showIds, shows),
    playlistId: remote.id,
    playlistName: remote.name,
    playlistDescription: remote.description,
  };
  const decoded = decodeDescription(remote.description);
  // Invalid or missing configs get rewritten from the local copy later.
  if (decoded.kind !== 'valid' && decoded.kind !== 'local') return linked;
  if (decoded.updatedAt < local.updatedAt) return linked;
  // Same edit or a newer one: follow renames made in Spotify too.
  const name = listName(remote.name, local.name);
  if (decoded.kind === 'local') return { ...linked, name };
  return {
    ...linked,
    ...decoded.config,
    showIds: resolveShowIds(decoded.config.showIds, shows),
    name,
    updatedAt: decoded.updatedAt,
  };
}

/**
 * Aligns the local smart lists with the configs synced in the descriptions
 * of their playlists: applies newer edits, adds lists made on other devices
 * and drops the ones whose playlist was removed.
 */
export async function reconcileSmartLists(): Promise<void> {
  const [me, playlists, saved] = await Promise.all([
    currentUserId(),
    getMyPlaylists(),
    savedShows(),
  ]);
  const shows = saved.map((s) => s.show);
  const mine = playlists.filter((p) => p.owner.id === me);
  const byId = new Map(mine.map((p) => [p.id, p]));
  const store = useFilters.getState();
  const synced = store.smartLists.filter((l) => l.spotifyPlaylist);

  // Playlists missing from /me/playlists may just be lagging: double check.
  const missing = synced.filter((l) => l.playlistId && !byId.has(l.playlistId));
  const followed = missing.length
    ? await libraryContains(
        missing.map((l) => `spotify:playlist:${l.playlistId}`),
      )
    : [];
  missing.forEach((list, i) => {
    if (followed[i]) return;
    store.deleteSmartList(list.id);
    toast(i18n.t('smart.removedElsewhere', { name: list.name }));
  });

  const linked = new Set<string>();
  for (const list of synced) {
    const remote = list.playlistId
      ? byId.get(list.playlistId)
      : // Ids were reset by a logout: find the list's playlist again.
        mine.find(
          (p) =>
            p.name === playlistName(list) &&
            decodeDescription(p.description).kind !== 'none' &&
            !synced.some((l) => l.playlistId === p.id),
        );
    if (!remote || linked.has(remote.id)) continue;
    linked.add(remote.id);
    store.applyRemoteSmartList(mergeRemote(list, remote, shows));
  }

  for (const remote of mine) {
    if (linked.has(remote.id)) continue;
    const decoded = decodeDescription(remote.description);
    if (decoded.kind !== 'valid') continue;
    store.applyRemoteSmartList({
      id: newSmartListId(),
      name: listName(remote.name, remote.name),
      ...decoded.config,
      showIds: resolveShowIds(decoded.config.showIds, shows),
      spotifyPlaylist: true,
      playlistId: remote.id,
      playlistName: remote.name,
      playlistDescription: remote.description,
      updatedAt: decoded.updatedAt,
    });
  }
}

/** Startup job: sync configs, then rebuild every smart playlist in turn. */
export async function syncAllSmartPlaylists(): Promise<void> {
  try {
    await reconcileSmartLists();
  } catch {
    // Offline or rate limited: rebuild what we have, sync on next start.
  }
  for (const list of useFilters.getState().smartLists) {
    try {
      await syncSmartPlaylist(list);
    } catch {
      // Keep going with the other lists; they'll retry on next start.
    }
  }
}

/** Removes ("unfollows") the Spotify playlist of a smart list, if any. */
export async function dropSmartPlaylist(list: SmartList): Promise<void> {
  if (!list.playlistId) return;
  try {
    await removeFromLibrary([`spotify:playlist:${list.playlistId}`]);
  } catch {
    toast(i18n.t('errors.generic'), { tone: 'error' });
  }
  useFilters.getState().setSmartPlaylist(list.id, null, null, null);
}
