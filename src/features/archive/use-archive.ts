import { useCallback } from 'react';
import i18n from '../../i18n';
import type { SimplifiedEpisode } from '../../lib/spotify/types';
import { toast } from '../../lib/storage/toasts';
import { removeFromQueue } from '../queue/queue';
import {
  archiveStatus,
  isArchivedIn,
  useArchiveStore,
  type ArchiveStatus,
} from './archive-store';

/**
 * Predicate deciding whether an episode is archived: completed on Spotify or
 * archived here (pending sync), unless the user restored it.
 */
export function useIsArchived(): (episode: SimplifiedEpisode) => boolean {
  const pending = useArchiveStore((s) => s.pending);
  const restored = useArchiveStore((s) => s.restored);
  return useCallback(
    (episode: SimplifiedEpisode) =>
      isArchivedIn(episode, { pending, restored }),
    [pending, restored],
  );
}

export function useArchiveStatus(episode: SimplifiedEpisode): ArchiveStatus {
  const pending = useArchiveStore((s) => s.pending);
  const restored = useArchiveStore((s) => s.restored);
  return archiveStatus(episode, { pending, restored });
}

export function restoreEpisode(episode: SimplifiedEpisode) {
  useArchiveStore.getState().restore(episode);
  toast(i18n.t('archive.restoredToast', { name: episode.name }));
}

/** Archives an episode: it leaves Up Next and gets completed on Spotify later. */
export function archiveEpisode(episode: SimplifiedEpisode) {
  useArchiveStore.getState().archive(episode);
  void removeFromQueue(episode.uri, { silent: true }).catch(() => undefined);
  toast(i18n.t('archive.archivedToast', { name: episode.name }), {
    action: {
      label: i18n.t('archive.undo'),
      run: () => useArchiveStore.getState().restore(episode),
    },
  });
}
