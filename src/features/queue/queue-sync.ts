/**
 * A device playing the Up Next playlist keeps the order it loaded with the
 * context: later edits to the playlist don't reach it. These helpers compare
 * that order with the current Up Next to decide when to reload it.
 */

/** Episodes that follow `current`; all of them when `current` isn't there. */
export function upcoming(order: string[], current: string): string[] {
  return order.slice(order.indexOf(current) + 1);
}

/**
 * - `now`: the episode after the current one changed, so the device would
 *   play the wrong one next;
 * - `later`: only episodes further down changed;
 * - `none`: the device will play what Up Next says (episodes removed before
 *   the current one, like the finished ones, don't matter).
 */
export type QueueDrift = 'none' | 'now' | 'later';

export function queueDrift(
  loaded: string[],
  queue: string[],
  current: string,
): QueueDrift {
  const device = upcoming(loaded, current);
  const wanted = upcoming(queue, current);
  if (device[0] !== wanted[0]) return 'now';
  const same =
    device.length === wanted.length && device.every((u, i) => u === wanted[i]);
  return same ? 'none' : 'later';
}
