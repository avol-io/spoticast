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
  SimplifiedShow,
} from '../../lib/spotify/types';
import { useFilters, type SmartList } from '../../lib/storage/filters';
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

async function computeEpisodes(list: SmartList): Promise<Episode[]> {
  const saved = await fetchShared({
    queryKey: libraryKeys.savedShows,
    queryFn: ({ signal }) => getSavedShows(signal),
    staleTime: 5 * 60_000,
  });
  const shows = selectShows(saved, list.showIds);
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

/** Finds, creates or re-follows the list's playlist and keeps its name in sync. */
async function ensureSmartPlaylist(list: SmartList): Promise<string> {
  const name = `${SMART_PLAYLIST_PREFIX}${list.name}`;
  let id = list.playlistId;
  if (id) {
    const [followed] = await libraryContains([`spotify:playlist:${id}`]);
    if (!followed) await saveToLibrary([`spotify:playlist:${id}`]);
    if (list.playlistName !== name) await updatePlaylistDetails(id, { name });
  } else {
    const me = await currentUserId();
    const existing = (await getMyPlaylists()).find(
      (p) => p.name === name && p.owner.id === me,
    );
    id =
      existing?.id ??
      (await createPlaylist(name, `Smart filter · managed by Spoticast`)).id;
  }
  useFilters.getState().setSmartPlaylist(list.id, id, name);
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

/** Startup job: rebuild every smart playlist, one at a time. */
export async function syncAllSmartPlaylists(): Promise<void> {
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
  useFilters.getState().setSmartPlaylist(list.id, null, null);
}
