import { useQueryClient } from '@tanstack/react-query';
import { flushSync } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { create } from 'zustand';
import type { Episode, SimplifiedEpisode } from '../../lib/spotify/types';

/** The search param holding the id of the episode shown in the card. */
export const EPISODE_PARAM = 'episode';

/** View transition name shared by the row and the card it opens. */
export const CARD_TRANSITION = 'episode-card';

export const episodeKey = (id: string) => ['episode', id] as const;

/**
 * The row the card was last opened from: it carries the transition name
 * while the card is closed, so the row grows into the card and back.
 */
export const useEpisodeCard = create<{ lastOpened: string | null }>(() => ({
  lastOpened: null,
}));

interface CardState {
  episodeCard?: boolean;
}

/** Opens the episode card over the current page (back closes it). */
export function useOpenEpisode() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  return (episode: SimplifiedEpisode | Episode) => {
    // The row already has the episode: show it at once. Without its show
    // (podcast pages) and none cached, it is marked stale so the card
    // fetches the rest.
    const key = episodeKey(episode.id);
    const merged = {
      ...queryClient.getQueryData<Episode>(key),
      ...episode,
    } as Episode;
    queryClient.setQueryData(
      key,
      merged,
      merged.show ? undefined : { updatedAt: 0 },
    );
    const params = new URLSearchParams(location.search);
    params.set(EPISODE_PARAM, episode.id);
    flushSync(() => useEpisodeCard.setState({ lastOpened: episode.id }));
    navigate(
      {
        pathname: location.pathname,
        search: `?${params}`,
        hash: location.hash,
      },
      {
        state: { episodeCard: true } satisfies CardState,
        preventScrollReset: true,
        viewTransition: true,
      },
    );
  };
}

/** Closes the card: back when we opened it, else drops the param. */
export function useCloseEpisode() {
  const navigate = useNavigate();
  const location = useLocation();
  return () => {
    if ((location.state as CardState | null)?.episodeCard) {
      // React Router replays the view transition on POP.
      navigate(-1);
      return;
    }
    const params = new URLSearchParams(location.search);
    params.delete(EPISODE_PARAM);
    const search = params.toString();
    navigate(
      { pathname: location.pathname, search: search && `?${search}` },
      { replace: true, preventScrollReset: true, viewTransition: true },
    );
  };
}
