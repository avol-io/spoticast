import { releaseDate } from '../../lib/episodes';
import type {
  Paging,
  SavedShow,
  SimplifiedEpisode,
  SimplifiedShow,
} from '../../lib/spotify/types';
import type { LibrarySort } from '../../lib/storage/library-prefs';

/** Release time of the newest episode, falling back to when it was followed. */
function latestTime(
  saved: SavedShow,
  latest?: Paging<SimplifiedEpisode>,
): number {
  const first = latest?.items.find(Boolean);
  return first
    ? releaseDate(first).getTime()
    : new Date(saved.added_at).getTime();
}

export function sortShows(
  saved: SavedShow[],
  sort: LibrarySort,
  latestByShow: Map<string, Paging<SimplifiedEpisode> | undefined>,
  manualOrder: string[],
  locale?: string,
): SimplifiedShow[] {
  const byLatest = [...saved].sort(
    (a, b) =>
      latestTime(b, latestByShow.get(b.show.id)) -
      latestTime(a, latestByShow.get(a.show.id)),
  );
  if (sort === 'latest') return byLatest.map((s) => s.show);
  if (sort === 'alpha') {
    return saved
      .map((s) => s.show)
      .sort((a, b) =>
        a.name.localeCompare(b.name, locale, { sensitivity: 'base' }),
      );
  }
  // Manual: the user's order first, then shows they never placed (e.g. newly
  // followed) in latest-episode order.
  const position = new Map(manualOrder.map((id, index) => [id, index]));
  const placed = saved
    .filter((s) => position.has(s.show.id))
    .sort(
      (a, b) => (position.get(a.show.id) ?? 0) - (position.get(b.show.id) ?? 0),
    );
  const rest = byLatest.filter((s) => !position.has(s.show.id));
  return [...placed, ...rest].map((s) => s.show);
}
