import { withViewTransition } from '../../lib/view-transition';
import { usePlayer } from './player-store';

/** Shared by the mini player cover and the full player one: they morph. */
export const COVER_TRANSITION = 'player-cover';

/** Opens the full player, growing it out of the mini player cover. */
export function openFullPlayer() {
  withViewTransition(() => usePlayer.getState().setFullPlayerOpen(true));
}

export function closeFullPlayer() {
  withViewTransition(() => usePlayer.getState().setFullPlayerOpen(false));
}
