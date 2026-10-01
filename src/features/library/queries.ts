import {
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { isFullyPlayed } from '../../lib/episodes';
import {
  getSavedShows,
  getShow,
  getShowEpisodes,
  PAGE_SIZE,
  removeFromLibrary,
  saveToLibrary,
} from '../../lib/spotify/endpoints';
import type {
  Paging,
  SavedShow,
  SimplifiedEpisode,
  SimplifiedShow,
} from '../../lib/spotify/types';
import { toast } from '../../lib/storage/toasts';

export const libraryKeys = {
  savedShows: ['shows', 'saved'] as const,
  show: (id: string) => ['show', id] as const,
  /** First page (latest 50 episodes): drives badges and home sorting. */
  latestEpisodes: (showId: string) => ['episodes', showId, 'latest'] as const,
  /** Every page, loaded on demand in the podcast detail. */
  allEpisodes: (showId: string) => ['episodes', showId, 'all'] as const,
  /** Prefix matching both episode queries of a show (or of every show). */
  episodes: (showId?: string) =>
    (showId ? ['episodes', showId] : ['episodes']) as readonly string[],
};

const MINUTE = 60_000;

export function useSavedShows() {
  return useQuery({
    queryKey: libraryKeys.savedShows,
    queryFn: ({ signal }) => getSavedShows(signal),
  });
}

export function useLatestEpisodes(showIds: string[]) {
  return useQueries({
    queries: showIds.map((id) => ({
      queryKey: libraryKeys.latestEpisodes(id),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getShowEpisodes(id, 0, signal),
      staleTime: 10 * MINUTE,
    })),
  });
}

function cachedShow(qc: QueryClient, id: string): SimplifiedShow | undefined {
  return qc
    .getQueryData<SavedShow[]>(libraryKeys.savedShows)
    ?.find((saved) => saved.show.id === id)?.show;
}

export function useShow(id: string) {
  const qc = useQueryClient();
  return useQuery<SimplifiedShow>({
    queryKey: libraryKeys.show(id),
    queryFn: ({ signal }) => getShow(id, signal),
    staleTime: 60 * MINUTE,
    // Followed shows are already in the library cache: render instantly.
    placeholderData: () => cachedShow(qc, id),
  });
}

export function useShowEpisodes(showId: string) {
  const qc = useQueryClient();
  const latestKey = libraryKeys.latestEpisodes(showId);
  return useInfiniteQuery({
    queryKey: libraryKeys.allEpisodes(showId),
    queryFn: ({ pageParam, signal }) =>
      getShowEpisodes(showId, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (last: Paging<SimplifiedEpisode>) =>
      last.next ? last.offset + last.limit : undefined,
    staleTime: 10 * MINUTE,
    // Reuse the home's first page so the detail opens without a request.
    initialData: () => {
      const latest = qc.getQueryData<Paging<SimplifiedEpisode>>(latestKey);
      return latest ? { pages: [latest], pageParams: [0] } : undefined;
    },
    initialDataUpdatedAt: () => qc.getQueryState(latestKey)?.dataUpdatedAt,
  });
}

/** Flattens the pages of an episode infinite query. */
export function flattenEpisodes(
  data: InfiniteData<Paging<SimplifiedEpisode>> | undefined,
) {
  return data?.pages.flatMap((page) => page.items.filter(Boolean)) ?? [];
}

export interface Badge {
  count: number;
  /** True when every fetched episode counts and older ones were not checked. */
  more: boolean;
}

/** Unarchived episodes among the latest page, for the home badge. */
export function unplayedBadge(
  page: Paging<SimplifiedEpisode> | undefined,
  isArchived: (episode: SimplifiedEpisode) => boolean = isFullyPlayed,
): Badge | undefined {
  if (!page) return undefined;
  const count = page.items.filter((ep) => ep && !isArchived(ep)).length;
  return { count, more: count === PAGE_SIZE && page.next !== null };
}

export function useFollowShow() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async ({
      show,
      follow,
    }: {
      show: SimplifiedShow;
      follow: boolean;
    }) => {
      if (follow) await saveToLibrary([show.uri]);
      else await removeFromLibrary([show.uri]);
    },
    onMutate: async ({ show, follow }) => {
      await qc.cancelQueries({ queryKey: libraryKeys.savedShows });
      const previous = qc.getQueryData<SavedShow[]>(libraryKeys.savedShows);
      qc.setQueryData<SavedShow[]>(libraryKeys.savedShows, (shows = []) =>
        follow
          ? [
              { added_at: new Date().toISOString(), show },
              ...shows.filter((s) => s.show.id !== show.id),
            ]
          : shows.filter((s) => s.show.id !== show.id),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      qc.setQueryData(libraryKeys.savedShows, context?.previous);
      toast(t('errors.generic'), { tone: 'error' });
    },
    onSuccess: (_data, { show, follow }) => {
      toast(
        t(follow ? 'podcast.followed' : 'podcast.unfollowed', {
          name: show.name,
        }),
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: libraryKeys.savedShows }),
  });
}

export function useIsFollowing(showId: string): boolean | undefined {
  const { data } = useSavedShows();
  return data?.some((saved) => saved.show.id === showId);
}
