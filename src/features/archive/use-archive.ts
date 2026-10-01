import { useCallback } from 'react';
import { isFullyPlayed } from '../../lib/episodes';
import type { SimplifiedEpisode } from '../../lib/spotify/types';

/**
 * Returns the predicate deciding whether an episode is archived.
 * Archived = completed on Spotify (manual archiving extends this in M4).
 */
export function useIsArchived(): (episode: SimplifiedEpisode) => boolean {
  return useCallback(
    (episode: SimplifiedEpisode) => isFullyPlayed(episode),
    [],
  );
}
