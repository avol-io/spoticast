import { flushSync } from 'react-dom';

/**
 * Runs a state update inside a view transition when the browser has them
 * (and motion is welcome), so named elements morph between the two states.
 */
export function withViewTransition(update: () => void) {
  if (
    typeof document.startViewTransition !== 'function' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    update();
    return;
  }
  document.startViewTransition(() => flushSync(update));
}
