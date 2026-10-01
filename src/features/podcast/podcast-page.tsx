import { Archive, Headphones } from 'lucide-react';
import { useEffect, useRef, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import EmptyState from '../../app/ui/empty-state';
import { isVideoShow, pickImage } from '../../lib/episodes';
import { useDominantColor } from '../../lib/color/dominant';
import { useIsArchived } from '../archive/use-archive';
import EpisodeActions from '../player/episode-actions';
import { flattenEpisodes, useShow, useShowEpisodes } from '../library/queries';
import EpisodeRow from './episode-row';
import PodcastHero from './podcast-hero';

type Tab = 'unplayed' | 'archived';

/** Loads the next page when the sentinel scrolls into view. */
function useAutoLoad(enabled: boolean, load: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!enabled || !node || typeof IntersectionObserver === 'undefined')
      return;
    const observer = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && load(),
      { rootMargin: '600px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, load]);
  return ref;
}

export function PodcastPage() {
  const { showId = '' } = useParams();
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'archived' ? 'archived' : 'unplayed';

  const show = useShow(showId);
  const episodesQuery = useShowEpisodes(showId);
  const isArchived = useIsArchived();
  const accent = useDominantColor(pickImage(show.data?.images, 300));

  const all = flattenEpisodes(episodesQuery.data);
  const archived = all.filter(isArchived);
  const unplayed = all.filter((ep) => !isArchived(ep));
  const visible = tab === 'archived' ? archived : unplayed;
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = episodesQuery;
  const sentinel = useAutoLoad(
    !!hasNextPage && !isFetchingNextPage,
    fetchNextPage,
  );

  const setTab = (next: Tab) =>
    setParams(next === 'archived' ? { tab: 'archived' } : {}, {
      replace: true,
    });

  return (
    <div
      style={accent ? ({ '--accent': accent } as CSSProperties) : undefined}
      className="relative min-h-dvh"
    >
      {/* Cover-tinted backdrop fading into the page background. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-gradient-to-b from-accent/45 via-accent/10 to-transparent transition-colors duration-700"
      />
      <div className="pt-safe relative mx-auto max-w-6xl px-4 pt-3 pb-8 lg:grid lg:grid-cols-[300px_1fr] lg:gap-10 lg:px-8 lg:pt-8">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          {show.data ? (
            <PodcastHero show={show.data} />
          ) : show.isError ? (
            <EmptyState
              title={t('errors.loadFailed')}
              description={show.error.message}
            />
          ) : (
            <div className="aspect-square w-36 animate-pulse rounded-xl bg-surface-2 lg:w-full" />
          )}
        </aside>

        <section className="mt-6 lg:mt-0">
          <div
            role="tablist"
            className="sticky top-0 z-10 -mx-4 flex gap-1 bg-bg/80 px-4 py-2 backdrop-blur-md lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none"
          >
            {(
              [
                ['unplayed', t('podcast.tabUnplayed'), unplayed.length],
                ['archived', t('podcast.tabArchived'), archived.length],
              ] as const
            ).map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  tab === value
                    ? 'bg-fg text-bg'
                    : 'text-fg-muted hover:bg-surface-2'
                }`}
              >
                {label}
                <span className="ml-1.5 tabular-nums opacity-60">
                  {count}
                  {hasNextPage ? '+' : ''}
                </span>
              </button>
            ))}
          </div>

          <div role="tabpanel">
            {episodesQuery.isPending ? (
              <ul className="animate-pulse divide-y divide-border">
                {Array.from({ length: 6 }, (_, i) => (
                  <li key={i} className="flex flex-col gap-2 py-4">
                    <div className="h-3 w-24 rounded bg-surface-2" />
                    <div className="h-4 w-3/4 rounded bg-surface-2" />
                  </li>
                ))}
              </ul>
            ) : episodesQuery.isError && all.length === 0 ? (
              <EmptyState
                title={t('errors.loadFailed')}
                description={episodesQuery.error.message}
              />
            ) : visible.length === 0 && !hasNextPage ? (
              tab === 'unplayed' ? (
                <EmptyState
                  icon={<Headphones />}
                  title={t('podcast.noUnplayed')}
                  description={t('podcast.noUnplayedHint')}
                />
              ) : (
                <EmptyState
                  icon={<Archive />}
                  title={t('podcast.noArchived')}
                />
              )
            ) : (
              <ul className="divide-y divide-border">
                {visible.map((episode) => (
                  <li key={episode.id}>
                    <EpisodeRow
                      episode={episode}
                      video={isVideoShow(show.data)}
                      actions={
                        show.data && (
                          <EpisodeActions
                            episode={{ ...episode, show: show.data }}
                            video={isVideoShow(show.data)}
                          />
                        )
                      }
                    />
                  </li>
                ))}
              </ul>
            )}

            {hasNextPage && (
              <div ref={sentinel} className="flex justify-center py-6">
                <button
                  type="button"
                  disabled={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                  className="rounded-full bg-surface-2 px-5 py-2 text-sm font-semibold text-fg-muted hover:text-fg"
                >
                  {isFetchingNextPage
                    ? t('podcast.loadingMore')
                    : t('podcast.loadMore')}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default PodcastPage;
