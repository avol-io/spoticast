import { useEffect } from 'react';
import { onForeground } from '../../lib/pwa/foreground';
import { syncAllSmartPlaylists } from './smart-lists';

/** Back from the background after this long, rebuild them again. */
export const SMART_RESYNC_MS = 30 * 60_000;

let lastRun = 0;

function run() {
  lastRun = Date.now();
  void syncAllSmartPlaylists();
}

/**
 * Rebuilds the "Spoticast - <name>" playlists when the app starts, and when
 * it comes back to the foreground at least 30 minutes after the last time.
 */
export function SmartPlaylistsRuntime() {
  useEffect(() => {
    if (!lastRun) run();
    return onForeground(() => {
      if (Date.now() - lastRun >= SMART_RESYNC_MS) run();
    });
  }, []);
  return null;
}

/** Test hook: forget the last run. */
export function resetSmartPlaylistsRuntime() {
  lastRun = 0;
}

export default SmartPlaylistsRuntime;
