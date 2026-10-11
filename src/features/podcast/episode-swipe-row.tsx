import {
  Archive,
  ArchiveRestore,
  ListEnd,
  ListMinus,
  ListStart,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import SwipeRow, { type SwipeAction } from '../../app/ui/swipe-row';
import type { Episode } from '../../lib/spotify/types';
import {
  archiveEpisode,
  restoreEpisode,
  useIsArchived,
} from '../archive/use-archive';
import { usePlayer } from '../player/player-store';
import { addToQueue, removeFromQueue } from '../queue/queue';
import { useSelection } from '../selection/selection-store';

export interface EpisodeSwipeRowProps {
  episode: Episode;
  /** Up Next rows can also be removed from the queue. */
  inQueue?: boolean;
  /** Starts the selection on this row (from `useSelectableList`). */
  onStartSelection: () => void;
  selecting: boolean;
  children: ReactNode;
}

/**
 * An episode row with swipe actions (play next, play last, archive; plus
 * remove in Up Next) and press-and-hold to select. The row menu offers the
 * same actions.
 */
export function EpisodeSwipeRow({
  episode,
  inQueue = false,
  onStartSelection,
  selecting,
  children,
}: EpisodeSwipeRowProps) {
  const { t } = useTranslation();
  const nowPlayingUri = usePlayer((s) => s.nowPlaying?.uri);
  const archived = useIsArchived()(episode);
  const selected = useSelection((s) => s.selected.includes(episode.uri));
  const toggle = useSelection((s) => s.toggle);

  const actions: SwipeAction[] = [
    {
      label: t('episode.playNext'),
      icon: <ListStart />,
      tone: 'brand',
      onSelect: () =>
        void addToQueue(episode, 'next', nowPlayingUri).catch(() => undefined),
    },
    {
      label: t('episode.playLast'),
      icon: <ListEnd />,
      tone: 'neutral',
      onSelect: () =>
        void addToQueue(episode, 'last', nowPlayingUri).catch(() => undefined),
    },
    ...(inQueue
      ? [
          {
            label: t('episode.removeFromQueue'),
            icon: <ListMinus />,
            tone: 'neutral' as const,
            onSelect: () =>
              void removeFromQueue(episode.uri).catch(() => undefined),
          },
        ]
      : []),
    archived
      ? {
          label: t('archive.restore'),
          icon: <ArchiveRestore />,
          tone: 'neutral',
          onSelect: () => restoreEpisode(episode),
        }
      : {
          label: t('archive.archive'),
          icon: <Archive />,
          tone: 'danger',
          onSelect: () => archiveEpisode(episode),
        },
  ];

  return (
    <SwipeRow
      actions={actions}
      onLongPress={onStartSelection}
      selecting={selecting}
      selected={selected}
      onToggle={() => toggle(episode.uri)}
      selectLabel={t('selection.row', { name: episode.name })}
    >
      {children}
    </SwipeRow>
  );
}

export default EpisodeSwipeRow;
