import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  ListChecks,
  ListMusic,
  ListX,
  MoreVertical,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import EmptyState from '../../app/ui/empty-state';
import IconButton from '../../app/ui/icon-button';
import Menu from '../../app/ui/menu';
import PageHeader from '../../app/ui/page-header';
import Sheet from '../../app/ui/sheet';
import SpotifyIcon from '../../app/ui/spotify-icon';
import { episodeProgress, formatDuration } from '../../lib/episodes';
import type { Episode } from '../../lib/spotify/types';
import { PlayButton } from '../player/episode-actions';
import { switchToSpotify } from '../player/player-controller';
import { usePlayer } from '../player/player-store';
import EpisodeRow from '../podcast/episode-row';
import EpisodeSwipeRow from '../podcast/episode-swipe-row';
import { useSelectableList } from '../selection/selection-store';
import { clearQueue, moveInQueue, removeFromQueue, useQueue } from './queue';
import { useQueueStore } from './queue-store';
import { useErrorText } from '../../lib/spotify/errors';

function QueueItem({
  episode,
  playing,
  selecting,
  onStartSelection,
}: {
  episode: Episode;
  playing: boolean;
  selecting: boolean;
  onStartSelection: () => void;
}) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: episode.uri });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-1 bg-bg ${isDragging ? 'relative z-10 rounded-xl shadow-2xl ring-1 ring-border' : ''}`}
    >
      <button
        type="button"
        hidden={selecting}
        ref={setActivatorNodeRef}
        aria-label={`${t('queue.reorder')}: ${episode.name}`}
        className="flex h-12 w-8 shrink-0 cursor-grab touch-none items-center justify-center text-fg-subtle hover:text-fg active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-5" aria-hidden />
      </button>
      <div className="min-w-0 flex-1">
        <EpisodeSwipeRow
          episode={episode}
          inQueue
          selecting={selecting}
          onStartSelection={onStartSelection}
        >
          <EpisodeRow
            episode={episode}
            showCover
            eyebrow={playing ? t('queue.nowPlaying') : episode.show?.name}
            actions={
              <>
                <IconButton
                  label={`${t('queue.remove')}: ${episode.name}`}
                  onClick={() =>
                    void removeFromQueue(episode.uri).catch(() => undefined)
                  }
                >
                  <X />
                </IconButton>
                <PlayButton episode={episode} />
              </>
            }
          />
        </EpisodeSwipeRow>
      </div>
    </li>
  );
}

/** Confirms emptying Up Next (nothing gets archived). */
function ClearDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Sheet open={open} onClose={onClose} label={t('queue.clearQueue')}>
      <h2 className="text-lg font-bold">{t('queue.clearQueue')}</h2>
      <p className="mt-1 text-sm text-fg-muted">{t('queue.clearConfirm')}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-4 py-2 font-semibold text-fg-muted hover:bg-surface-2"
        >
          {t('queue.cancel')}
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            void clearQueue().catch(() => undefined);
          }}
          className="rounded-full bg-danger px-5 py-2 font-semibold text-danger-fg"
        >
          {t('queue.clearQueue')}
        </button>
      </div>
    </Sheet>
  );
}

export function QueuePage() {
  const errorText = useErrorText();
  const { t, i18n } = useTranslation();
  const queue = useQueue();
  const nowPlayingUri = usePlayer((s) => s.nowPlaying?.uri);
  const playlistId = useQueueStore((s) => s.playlistId);
  const [clearOpen, setClearOpen] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const episodes = useMemo(() => queue.data?.episodes ?? [], [queue.data]);
  const selection = useSelectableList('queue', 'queue', episodes);
  const uris = episodes.map((ep) => ep.uri);
  const remainingMs = episodes.reduce(
    (sum, ep) => sum + episodeProgress(ep).remainingMs,
    0,
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    void moveInQueue(
      uris.indexOf(String(active.id)),
      uris.indexOf(String(over.id)),
    ).catch(() => undefined);
  };

  return (
    <>
      <PageHeader
        title={t('nav.queue')}
        actions={
          <Menu
            label={t('episode.more')}
            icon={<MoreVertical />}
            items={[
              ...(episodes.length > 0
                ? [
                    {
                      label: t('selection.select'),
                      icon: <ListChecks />,
                      onSelect: () => selection.start(),
                    },
                    {
                      label: t('queue.clearQueue'),
                      icon: <ListX />,
                      danger: true,
                      onSelect: () => setClearOpen(true),
                    },
                  ]
                : []),
              ...(playlistId
                ? [
                    {
                      label: t('player.switchToSpotify'),
                      icon: <SpotifyIcon />,
                      onSelect: () => void switchToSpotify(playlistId),
                    },
                  ]
                : []),
            ]}
          />
        }
      />
      <div className="mx-auto max-w-6xl px-4 pb-6 lg:px-8">
        <div className="max-w-3xl">
          {queue.isPending ? (
            <p className="animate-pulse py-8 text-center text-fg-muted">
              {t('queue.preparing')}
            </p>
          ) : queue.isError && !queue.data ? (
            <EmptyState
              title={t('errors.loadFailed')}
              description={errorText(queue.error)}
              action={
                <button
                  type="button"
                  onClick={() => queue.refetch()}
                  className="font-semibold text-brand"
                >
                  {t('errors.retry')}
                </button>
              }
            />
          ) : episodes.length === 0 ? (
            <EmptyState
              icon={<ListMusic />}
              title={t('queue.empty')}
              description={t('queue.emptyHint')}
            />
          ) : (
            <>
              <p className="pb-2 text-sm text-fg-muted">
                {t('queue.summary', {
                  count: episodes.length,
                  time: formatDuration(remainingMs, i18n.language),
                })}
              </p>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDragEnd}
              >
                <SortableContext
                  items={uris}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="divide-y divide-border">
                    {episodes.map((episode, index) => (
                      <QueueItem
                        key={episode.uri}
                        episode={episode}
                        playing={index === 0 && episode.uri === nowPlayingUri}
                        selecting={selection.selecting}
                        onStartSelection={() => selection.start(episode.uri)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            </>
          )}
          {!!queue.data?.otherCount && (
            <p className="mt-4 text-xs text-fg-subtle">
              {t('queue.otherItems')}
            </p>
          )}
        </div>
      </div>
      <ClearDialog open={clearOpen} onClose={() => setClearOpen(false)} />
    </>
  );
}

export default QueuePage;
