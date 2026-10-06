import { ArrowDownUp, LayoutGrid, LayoutList, Search } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import EmptyState from '../../app/ui/empty-state';
import IconButton from '../../app/ui/icon-button';
import Menu from '../../app/ui/menu';
import PageHeader from '../../app/ui/page-header';
import { useLibraryPrefs } from '../../lib/storage/library-prefs';
import { useIsArchived } from '../archive/use-archive';
import {
  unplayedBadge,
  useLatestEpisodes,
  useSavedShows,
} from '../library/queries';
import ShowGrid from './show-grid';
import { sortShows } from './sort-shows';
import { useErrorText } from '../../lib/spotify/errors';

function GridSkeleton() {
  return (
    <ul className="grid animate-pulse grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
      {Array.from({ length: 12 }, (_, i) => (
        <li key={i} className="aspect-square rounded-xl bg-surface-2" />
      ))}
    </ul>
  );
}

export function HomePage() {
  const errorText = useErrorText();
  const { t, i18n } = useTranslation();
  const { view, sort, manualOrder, setView, setSort, setManualOrder } =
    useLibraryPrefs();
  const saved = useSavedShows();
  const isArchived = useIsArchived();

  const ids = useMemo(
    () => saved.data?.map((s) => s.show.id) ?? [],
    [saved.data],
  );
  const latestQueries = useLatestEpisodes(ids);
  const latest = new Map(ids.map((id, i) => [id, latestQueries[i]?.data]));
  const badges = new Map(
    ids.map((id) => [id, unplayedBadge(latest.get(id), isArchived)]),
  );
  const shows = sortShows(
    saved.data ?? [],
    sort,
    latest,
    manualOrder,
    i18n.language,
  );

  return (
    <>
      <PageHeader
        title={t('nav.podcasts')}
        actions={
          <>
            <IconButton
              label={view === 'grid' ? t('home.viewList') : t('home.viewGrid')}
              onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
            >
              {view === 'grid' ? <LayoutList /> : <LayoutGrid />}
            </IconButton>
            <Menu
              label={t('home.sort')}
              title={t('home.sort')}
              icon={<ArrowDownUp />}
              items={(['latest', 'alpha', 'manual'] as const).map((value) => ({
                label: t(
                  value === 'latest'
                    ? 'home.sortLatest'
                    : value === 'alpha'
                      ? 'home.sortAlpha'
                      : 'home.sortManual',
                ),
                checked: sort === value,
                onSelect: () => setSort(value),
              }))}
            />
          </>
        }
      />
      <div className="mx-auto max-w-6xl px-4 pt-2 pb-6 lg:px-8">
        {saved.isPending ? (
          <GridSkeleton />
        ) : saved.isError && !saved.data ? (
          <EmptyState
            title={t('errors.loadFailed')}
            description={errorText(saved.error)}
            action={
              <button
                type="button"
                onClick={() => saved.refetch()}
                className="font-semibold text-brand"
              >
                {t('errors.retry')}
              </button>
            }
          />
        ) : shows.length === 0 ? (
          <EmptyState
            icon={<Search />}
            title={t('home.empty')}
            description={t('home.emptyHint')}
            action={
              <Link
                to="/search"
                className="rounded-full bg-brand px-5 py-2.5 font-semibold text-brand-fg"
              >
                {t('home.goToSearch')}
              </Link>
            }
          />
        ) : (
          <>
            {sort === 'manual' && (
              <p className="mb-3 text-xs text-fg-subtle">
                {t('home.dragHint')}
              </p>
            )}
            <ShowGrid
              shows={shows}
              layout={view}
              badges={badges}
              latest={latest}
              onReorder={sort === 'manual' ? setManualOrder : undefined}
            />
          </>
        )}
      </div>
    </>
  );
}

export default HomePage;
