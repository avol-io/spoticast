import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useViewTransitionState } from 'react-router-dom';
import type {
  Paging,
  SimplifiedEpisode,
  SimplifiedShow,
} from '../../lib/spotify/types';
import type { LibraryView } from '../../lib/storage/library-prefs';
import type { Badge } from '../library/queries';
import ShowCover from './show-cover';
import ShowListRow from './show-list';

// Drag and drop is only needed for the custom order: load dnd-kit lazily.
const SortableShowGrid = lazy(() => import('./sortable-show-grid'));

export interface ShowGridProps {
  shows: SimplifiedShow[];
  layout: LibraryView;
  badges: Map<string, Badge | undefined>;
  latest: Map<string, Paging<SimplifiedEpisode> | undefined>;
  /** Enables drag and drop; called with the new order of show ids. */
  onReorder?: (ids: string[]) => void;
}

export const gridClass = (layout: LibraryView) =>
  layout === 'grid'
    ? 'grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7'
    : 'flex flex-col';

export interface ShowLinkProps {
  show: SimplifiedShow;
  layout: LibraryView;
  badge?: Badge;
  latest?: SimplifiedEpisode;
  /** True right after a drop, so the click that follows doesn't navigate. */
  suppressClick?: () => boolean;
}

export function ShowLink({
  show,
  layout,
  badge,
  latest,
  suppressClick,
}: ShowLinkProps) {
  const { t } = useTranslation();
  const to = `/podcast/${show.id}`;
  // Name the cover only while navigating to/from this show, so exactly one
  // element morphs into the detail cover.
  const transitioning = useViewTransitionState(to);
  const transitionName = transitioning ? `cover-${show.id}` : undefined;
  const label =
    badge && badge.count > 0
      ? `${show.name}, ${t('home.unplayed', { count: badge.count })}`
      : show.name;

  return (
    <Link
      to={to}
      viewTransition
      aria-label={label}
      title={show.name}
      draggable={false}
      onClick={(e) => suppressClick?.() && e.preventDefault()}
      className={
        layout === 'grid'
          ? 'block rounded-xl transition-transform active:scale-[0.97]'
          : 'block rounded-xl px-2 hover:bg-surface-2'
      }
    >
      {layout === 'grid' ? (
        <ShowCover show={show} badge={badge} transitionName={transitionName} />
      ) : (
        <ShowListRow
          show={show}
          badge={badge}
          latest={latest}
          transitionName={transitionName}
        />
      )}
    </Link>
  );
}

function PlainGrid({ shows, layout, badges, latest }: ShowGridProps) {
  return (
    <ul className={gridClass(layout)}>
      {shows.map((show) => (
        <li key={show.id}>
          <ShowLink
            show={show}
            layout={layout}
            badge={badges.get(show.id)}
            latest={latest.get(show.id)?.items.find(Boolean)}
          />
        </li>
      ))}
    </ul>
  );
}

export function ShowGrid(props: ShowGridProps) {
  if (!props.onReorder) return <PlainGrid {...props} />;
  return (
    <Suspense fallback={<PlainGrid {...props} />}>
      <SortableShowGrid {...props} onReorder={props.onReorder} />
    </Suspense>
  );
}

export default ShowGrid;
