import { useMutation, useQuery } from '@tanstack/react-query';
import i18n from '../../i18n';
import { queryClient } from '../../lib/query/query-client';
import {
  getSavedEpisodes,
  removeFromLibrary,
  saveToLibrary,
} from '../../lib/spotify/endpoints';
import type { Episode, SavedEpisode } from '../../lib/spotify/types';
import { toast } from '../../lib/storage/toasts';
import type { MirrorPlan } from '../queue/queue-logic';

export const savedEpisodesKey = ['library', 'episodes'] as const;

/** Every episode in the user's "Your Episodes" collection. */
export function useSavedEpisodes() {
  return useQuery({
    queryKey: savedEpisodesKey,
    queryFn: ({ signal }) => getSavedEpisodes(signal),
    staleTime: 5 * 60_000,
  });
}

export function useIsSavedEpisode(uri: string): boolean | undefined {
  const { data } = useSavedEpisodes();
  return data?.some((saved) => saved.episode.uri === uri);
}

export function useToggleSavedEpisode() {
  return useMutation({
    mutationFn: async ({
      episode,
      save,
    }: {
      episode: Episode;
      save: boolean;
    }) => {
      if (save) await saveToLibrary([episode.uri]);
      else await removeFromLibrary([episode.uri]);
    },
    onMutate: ({ episode, save }) => {
      const previous =
        queryClient.getQueryData<SavedEpisode[]>(savedEpisodesKey);
      queryClient.setQueryData<SavedEpisode[]>(savedEpisodesKey, (list = []) =>
        save
          ? [{ added_at: new Date().toISOString(), episode }, ...list]
          : list.filter((s) => s.episode.uri !== episode.uri),
      );
      return { previous };
    },
    onError: (_e, _v, context) => {
      queryClient.setQueryData(savedEpisodesKey, context?.previous);
      toast(i18n.t('errors.generic'), { tone: 'error' });
    },
    onSuccess: (_d, { save }) =>
      toast(i18n.t(save ? 'episode.saved' : 'episode.unsaved')),
  });
}

/** Applies a mirror plan so "Your Episodes" equals the queue. */
export async function applyMirror(plan: MirrorPlan) {
  await saveToLibrary(plan.toAdd);
  await removeFromLibrary(plan.toRemove.map((s) => s.episode.uri));
  await queryClient.invalidateQueries({ queryKey: savedEpisodesKey });
}
