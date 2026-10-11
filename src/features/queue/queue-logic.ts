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
