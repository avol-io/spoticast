export interface ForegroundEvent {
  /** How long the app was hidden; Infinity when unknown (page restored). */
  hiddenMs: number;
  reason: 'visible' | 'pageshow' | 'online';
}

/**
 * Calls `callback` when the app comes back: visible again (also in an iOS
 * home screen app), restored from the back-forward cache, or back online.
 * Nothing runs while the app is in the background, so this is where state
 * that may have changed meanwhile gets refreshed. Returns the cleanup.
 */
export function onForeground(
  callback: (event: ForegroundEvent) => void,
  { debounceMs = 300 } = {},
): () => void {
  let hiddenAt: number | null = document.hidden ? Date.now() : null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: ForegroundEvent | null = null;

  const fire = (event: ForegroundEvent) => {
    // Several events can come together: keep the longest absence.
    pending = pending && pending.hiddenMs >= event.hiddenMs ? pending : event;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const ready = pending;
      pending = null;
      if (ready) callback(ready);
    }, debounceMs);
  };

  const onVisibility = () => {
    if (document.hidden) {
      hiddenAt = Date.now();
      return;
    }
    fire({
      hiddenMs: hiddenAt === null ? 0 : Date.now() - hiddenAt,
      reason: 'visible',
    });
    hiddenAt = null;
  };
  const onPageShow = (e: PageTransitionEvent) => {
    if (e.persisted) fire({ hiddenMs: Infinity, reason: 'pageshow' });
  };
  const onOnline = () => fire({ hiddenMs: 0, reason: 'online' });

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pageshow', onPageShow);
  window.addEventListener('online', onOnline);
  return () => {
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pageshow', onPageShow);
    window.removeEventListener('online', onOnline);
  };
}
