import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { SearchX } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import EmptyState from '../../app/ui/empty-state';
import { isVideoShow } from '../../lib/episodes';
import {
  getEpisode,
  search,
  SEARCH_PAGE_SIZE,
  type SearchType,
} from '../../lib/spotify/endpoints';
import type {
  Paging,
  SimplifiedEpisode,
  SimplifiedShow,
} from '../../lib/spotify/types';
import EpisodeActions from '../player/episode-actions';
import EpisodeRow from '../podcast/episode-row';
import ShowResultRow from './show-result-row';

/** Search episodes carry no show: fetch it (cached) to show and queue them. */
function EpisodeResult({ episode }: { episode: SimplifiedEpisode }) {
  const full = useQuery({
    queryKey: ['episode', episode.id],
    queryFn: ({ signal }) => getEpisode(episode.id, signal),
    staleTime: 60 * 60_000,
  });
  const show = full.data?.show;
  return (
    <EpisodeRow
      episode={full.data ?? episode}
      showCover
      eyebrow={show?.name}
      video={isVideoShow(show)}
      actions={
        full.data && (
          <EpisodeActions episode={full.data} video={isVideoShow(show)} />
        )
      }
    />
  );
}

export interface SearchResultsProps {
  query: string;
  type: SearchType;
  /** Called when the user opens a result (to remember the search). */
  onOpen?: () => void;
}

export function SearchResults({ query, type, onOpen }: SearchResultsProps) {
  const { t } = useTranslation();
  const results = useInfiniteQuery({
    queryKey: ['search', type, query],
    queryFn: ({ pageParam, signal }) => search(query, type, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const paging: Paging<unknown> | undefined =
        type === 'show' ? last.shows : last.episodes;
      return paging?.next ? pages.length * SEARCH_PAGE_SIZE : undefined;
    },
    staleTime: 5 * 60_000,
  });

  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = results;
  useEffect(() => {
    const node = sentinel.current;
    if (
      !node ||
      !hasNextPage ||
      isFetchingNextPage ||
      typeof IntersectionObserver === 'undefined'
    )
      return;
    const observer = new IntersectionObserver(
      (e) => e.some((x) => x.isIntersecting) && fetchNextPage(),
      {
        rootMargin: '400px',
      },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (results.isPending) {
    return (
      <p className="animate-pulse py-8 text-center text-fg-muted">
        {t('podcast.loadingMore')}
      </p>
    );
  }
  if (results.isError) {
    return (
      <EmptyState
        title={t('errors.loadFailed')}
        description={results.error.message}
      />
    );
  }

  const pages = results.data.pages;
  const shows = pages
    .flatMap((p) => p.shows?.items ?? [])
    .filter((s): s is SimplifiedShow => !!s);
  const episodes = pages
    .flatMap((p) => p.episodes?.items ?? [])
    .filter((e): e is SimplifiedEpisode => !!e);
  const empty = type === 'show' ? shows.length === 0 : episodes.length === 0;

  if (empty)
    return (
      <EmptyState icon={<SearchX />} title={t('search.noResults', { query })} />
    );

  return (
    <>
      {type === 'show' ? (
        <ul>
          {shows.map((show) => (
            <li key={show.id}>
              <ShowResultRow show={show} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-border" onClickCapture={onOpen}>
          {episodes.map((episode) => (
            <li key={episode.id}>
              <EpisodeResult episode={episode} />
            </li>
          ))}
        </ul>
      )}
      {hasNextPage && (
        <div ref={sentinel} className="flex justify-center py-4">
          <button
            type="button"
            disabled={isFetchingNextPage}
            onClick={() => fetchNextPage()}
            className="rounded-full bg-surface-2 px-5 py-2 text-sm font-semibold text-fg-muted hover:text-fg"
          >
            {isFetchingNextPage
              ? t('podcast.loadingMore')
              : t('search.loadMore')}
          </button>
        </div>
      )}
    </>
  );
}

export default SearchResults;
