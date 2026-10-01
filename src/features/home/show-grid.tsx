import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useRef, type MutableRefObject } from 'react';
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

export interface ShowGridProps {
  shows: SimplifiedShow[];
  layout: LibraryView;
  badges: Map<string, Badge | undefined>;
  latest: Map<string, Paging<SimplifiedEpisode> | undefined>;
  /** Enables drag and drop; called with the new order of show ids. */
  onReorder?: (ids: string[]) => void;
}

interface ItemProps {
  show: SimplifiedShow;
  layout: LibraryView;
  badge?: Badge;
  latest?: SimplifiedEpisode;
  sortable: boolean;
  justDragged: MutableRefObject<boolean>;
}

function ShowItem({
  show,
  layout,
  badge,
  latest,
  sortable,
  justDragged,
}: ItemProps) {
  const { t } = useTranslation();
  const to = `/podcast/${show.id}`;
  // Name the cover only while navigating to/from this show, so exactly one
  // element morphs into the detail cover.
  const transitioning = useViewTransitionState(to);
  const transitionName = transitioning ? `cover-${show.id}` : undefined;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: show.id,
    disabled: !sortable,
  });

  const label =
    badge && badge.count > 0
      ? `${show.name}, ${t('home.unplayed', { count: badge.count })}`
      : show.name;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`touch-manipulation select-none [-webkit-touch-callout:none] ${isDragging ? 'z-10 scale-105 opacity-90' : ''}`}
      {...(sortable ? { ...attributes, ...listeners } : {})}
    >
      <Link
        to={to}
        viewTransition
        aria-label={label}
        title={show.name}
        draggable={false}
        onClick={(e) => justDragged.current && e.preventDefault()}
        className={
          layout === 'grid'
            ? 'block rounded-xl transition-transform active:scale-[0.97]'
            : 'block rounded-xl px-2 hover:bg-surface-2'
        }
      >
        {layout === 'grid' ? (
          <ShowCover
            show={show}
            badge={badge}
            transitionName={transitionName}
          />
        ) : (
          <ShowListRow
            show={show}
            badge={badge}
            latest={latest}
            transitionName={transitionName}
          />
        )}
      </Link>
    </li>
  );
}

export function ShowGrid({
  shows,
  layout,
  badges,
  latest,
  onReorder,
}: ShowGridProps) {
  const justDragged = useRef(false);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    // Long-press on touch so normal scrolling and taps keep working.
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const ids = shows.map((s) => s.id);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    // The click that follows a drop must not open the podcast.
    setTimeout(() => (justDragged.current = false), 0);
    if (!over || active.id === over.id || !onReorder) return;
    onReorder(
      arrayMove(
        ids,
        ids.indexOf(String(active.id)),
        ids.indexOf(String(over.id)),
      ),
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={() => (justDragged.current = true)}
      onDragEnd={onDragEnd}
      onDragCancel={() => (justDragged.current = false)}
    >
      <SortableContext
        items={ids}
        strategy={
          layout === 'grid' ? rectSortingStrategy : verticalListSortingStrategy
        }
      >
        <ul
          className={
            layout === 'grid'
              ? 'grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7'
              : 'flex flex-col'
          }
        >
          {shows.map((show) => (
            <ShowItem
              key={show.id}
              show={show}
              layout={layout}
              badge={badges.get(show.id)}
              latest={latest.get(show.id)?.items.find(Boolean)}
              sortable={!!onReorder}
              justDragged={justDragged}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

export default ShowGrid;
