import { isFullyPlayed, isVideoShow, releaseDate } from '../episodes';
import type { SimplifiedEpisode, SimplifiedShow } from '../spotify/types';

export type ListeningStatus = 'not-started' | 'in-progress' | 'archived';

export const LISTENING_STATUSES: ListeningStatus[] = [
  'not-started',
  'in-progress',
  'archived',
];

/** Before v3 a filter had one status, plus "include archived" on smart lists. */
export type LegacyStatus = 'any' | 'not-started' | 'in-progress';

export function legacyStatuses(
  status: LegacyStatus | undefined,
  includeArchived: boolean,
): ListeningStatus[] {
  if (!status || status === 'any')
    return includeArchived ? [] : ['not-started', 'in-progress'];
  return includeArchived ? [status, 'archived'] : [status];
}

export interface FilterCriteria {
  minMinutes: number | null;
  maxMinutes: number | null;
  /** Published in the last N days (today counts as day 1). */
  withinDays: number | null;
  /** Any of these; empty = every status. */
  statuses: ListeningStatus[];
  /** Matched against title and description, ignoring case and accents. */
  text: string;
  /** Video podcasts only (Spotify flags video per show). */
  videoOnly: boolean;
}

export const emptyCriteria: FilterCriteria = {
  minMinutes: null,
  maxMinutes: null,
  withinDays: null,
  statuses: [],
  text: '',
  videoOnly: false,
};

export function isEmptyCriteria(c: FilterCriteria): boolean {
  return (
    c.minMinutes === null &&
    c.maxMinutes === null &&
    c.withinDays === null &&
    c.statuses.length === 0 &&
    c.text.trim() === '' &&
    !c.videoOnly
  );
}

/** Lowercases and strips accents, for forgiving text matches. */
export const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** A restored episode counts as not started, even if Spotify says played. */
export function listeningStatus(
  episode: SimplifiedEpisode,
  isArchived: (episode: SimplifiedEpisode) => boolean = isFullyPlayed,
): ListeningStatus {
  if (isArchived(episode)) return 'archived';
  const resume = episode.resume_point;
  return !resume?.fully_played && (resume?.resume_position_ms ?? 0) > 0
    ? 'in-progress'
    : 'not-started';
}

export function matchesCriteria(
  episode: SimplifiedEpisode,
  criteria: FilterCriteria,
  {
    show,
    now = new Date(),
    isArchived = isFullyPlayed,
  }: {
    show?: Pick<SimplifiedShow, 'media_type'>;
    now?: Date;
    /** Archived as the app sees it (useIsArchived); defaults to Spotify's. */
    isArchived?: (episode: SimplifiedEpisode) => boolean;
  } = {},
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

  if (
    criteria.statuses.length > 0 &&
    !criteria.statuses.includes(listeningStatus(episode, isArchived))
  )
    return false;

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
