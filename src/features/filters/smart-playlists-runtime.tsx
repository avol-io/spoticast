import { useEffect } from 'react';
import { syncAllSmartPlaylists } from './smart-lists';

let started = false;

/** Rebuilds the "Spoticast - <name>" playlists once per app start. */
export function SmartPlaylistsRuntime() {
  useEffect(() => {
    if (started) return;
    started = true;
    void syncAllSmartPlaylists();
  }, []);
  return null;
}

export default SmartPlaylistsRuntime;
