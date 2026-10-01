import type { SimplifiedEpisode, SimplifiedShow } from './spotify/types';

/** Release date as a local Date (Spotify gives "2024", "2024-05" or "2024-05-17"). */
export function releaseDate(
  episode: Pick<SimplifiedEpisode, 'release_date'>,
): Date {
  const [y, m = '1', d = '1'] = episode.release_date.split('-');
  return new Date(Number(y), Number(m) - 1, Number(d));
}

export function isFullyPlayed(episode: SimplifiedEpisode): boolean {
  return episode.resume_point?.fully_played ?? false;
}

export interface Progress {
  started: boolean;
  /** 0..1 */
  fraction: number;
  remainingMs: number;
}

export function episodeProgress(episode: SimplifiedEpisode): Progress {
  const position = episode.resume_point?.fully_played
    ? episode.duration_ms
    : (episode.resume_point?.resume_position_ms ?? 0);
  const fraction =
    episode.duration_ms > 0 ? Math.min(1, position / episode.duration_ms) : 0;
  return {
    started: position > 0,
    fraction,
    remainingMs: Math.max(0, episode.duration_ms - position),
  };
}

/** Video podcasts are flagged per show only (media_type), not per episode. */
export function isVideoShow(
  show: Pick<SimplifiedShow, 'media_type'> | undefined,
): boolean {
  return !!show && show.media_type !== 'audio';
}

export function formatDuration(ms: number, lang: string): string {
  const totalMinutes = Math.max(1, Math.round(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const fmt = (value: number, unit: 'hour' | 'minute') =>
    new Intl.NumberFormat(lang, {
      style: 'unit',
      unit,
      unitDisplay: 'narrow',
    }).format(value);
  if (hours === 0) return fmt(minutes, 'minute');
  return minutes === 0
    ? fmt(hours, 'hour')
    : `${fmt(hours, 'hour')} ${fmt(minutes, 'minute')}`;
}

/** "3:05" / "1:02:03" for player timestamps. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

const DAY_MS = 86_400_000;

/** "Today", "3 days ago", then "12 May" (or "12 May 2023" for other years). */
export function formatReleaseDate(
  date: Date,
  lang: string,
  now = new Date(),
): string {
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const days = Math.round((startOfToday.getTime() - date.getTime()) / DAY_MS);
  if (days >= 0 && days < 7) {
    return new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }).format(
      -days,
      'day',
    );
  }
  return new Intl.DateTimeFormat(lang, {
    day: 'numeric',
    month: 'short',
    ...(date.getFullYear() !== now.getFullYear() && { year: 'numeric' }),
  }).format(date);
}

/** Picks the smallest image at least `minSize` px wide (images come largest first). */
export function pickImage(
  images: { url: string; width: number | null }[] | undefined | null,
  minSize = 300,
): string | undefined {
  if (!images?.length) return undefined;
  const sorted = [...images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  return (
    sorted.find((img) => (img.width ?? 0) >= minSize) ??
    sorted[sorted.length - 1]
  ).url;
}
