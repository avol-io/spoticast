import { episodeProgress, isVideoShow, releaseDate } from '../episodes';
import type { SimplifiedEpisode, SimplifiedShow } from '../spotify/types';

export type ListeningStatus = 'any' | 'not-started' | 'in-progress';

export interface FilterCriteria {
  minMinutes: number | null;
  maxMinutes: number | null;
  /** Published in the last N days (today counts as day 1). */
  withinDays: number | null;
  status: ListeningStatus;
  /** Matched against title and description, ignoring case and accents. */
  text: string;
  /** Video podcasts only (Spotify flags video per show). */
  videoOnly: boolean;
}

export const emptyCriteria: FilterCriteria = {
  minMinutes: null,
  maxMinutes: null,
  withinDays: null,
  status: 'any',
  text: '',
  videoOnly: false,
};

export function isEmptyCriteria(c: FilterCriteria): boolean {
  return (
    c.minMinutes === null &&
    c.maxMinutes === null &&
    c.withinDays === null &&
    c.status === 'any' &&
    c.text.trim() === '' &&
    !c.videoOnly
  );
}

const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export function matchesCriteria(
  episode: SimplifiedEpisode,
  criteria: FilterCriteria,
  {
    show,
    now = new Date(),
  }: { show?: Pick<SimplifiedShow, 'media_type'>; now?: Date } = {},
): boolean {
  const minutes = episode.duration_ms / 60_000;
  if (criteria.minMinutes !== null && minutes < criteria.minMinutes)
    return false;
  if (criteria.maxMinutes !== null && minutes > criteria.maxMinutes)
    return false;

  if (criteria.withinDays !== null) {
    const cutoff = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - (criteria.withinDays - 1),
    );
    if (releaseDate(episode) < cutoff) return false;
  }

  if (criteria.status !== 'any') {
    const played = episode.resume_point?.fully_played ?? false;
    const started = episodeProgress(episode).started;
    if (criteria.status === 'not-started' && (started || played)) return false;
    if (criteria.status === 'in-progress' && (!started || played)) return false;
  }

  const text = fold(criteria.text.trim());
  if (
    text &&
    !fold(`${episode.name}\n${episode.description ?? ''}`).includes(text)
  )
    return false;

  if (criteria.videoOnly && !isVideoShow(show)) return false;
  return true;
}

export type EpisodeSort = 'newest' | 'oldest' | 'shortest' | 'longest';

export function sortEpisodes<T extends { episode: SimplifiedEpisode }>(
  items: T[],
  sort: EpisodeSort,
): T[] {
  const time = (item: T) => releaseDate(item.episode).getTime();
  const duration = (item: T) => item.episode.duration_ms;
  const compare: Record<EpisodeSort, (a: T, b: T) => number> = {
    newest: (a, b) => time(b) - time(a),
    oldest: (a, b) => time(a) - time(b),
    shortest: (a, b) => duration(a) - duration(b),
    longest: (a, b) => duration(b) - duration(a),
  };
  return [...items].sort(compare[sort]);
}
