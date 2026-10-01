import type { SavedEpisode } from '../../lib/spotify/types';

/**
 * Spotify's reorder API takes the index to insert *before*, counted in the
 * list before the move. Moving item `from` so that it ends up at `to`:
 */
export function moveRequest(from: number, to: number) {
  return { rangeStart: from, insertBefore: to > from ? to + 1 : to };
}

export function applyMove<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Where "Play next" inserts: right after the episode playing at the head of
 * the queue, or at the head when the head isn't playing.
 */
export function playNextPosition(
  queueUris: string[],
  nowPlayingUri: string | undefined,
): number {
  return nowPlayingUri && queueUris[0] === nowPlayingUri ? 1 : 0;
}

export interface MirrorPlan {
  toAdd: string[];
  toRemove: SavedEpisode[];
}

/** What makes "Your Episodes" equal to the queue. */
export function planMirror(
  queueUris: string[],
  saved: SavedEpisode[],
): MirrorPlan {
  const savedUris = new Set(saved.map((s) => s.episode.uri));
  const queued = new Set(queueUris);
  return {
    toAdd: [...queued].filter((uri) => !savedUris.has(uri)),
    toRemove: saved.filter((s) => !queued.has(s.episode.uri)),
  };
}
