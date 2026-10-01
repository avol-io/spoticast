import { useEffect } from 'react';
import { useSettings } from '../../lib/storage/settings';
import { ensureQueuePlaylist, pruneFinishedFromQueue } from '../queue/queue';
import {
  initPlayer,
  next,
  seekTo,
  skip,
  startPolling,
  togglePlay,
} from './player-controller';
import { usePlayer } from './player-store';

/** Lock screen / notification controls for playback in this browser. */
function useMediaSession() {
  const np = usePlayer((s) => s.nowPlaying);
  const { skipBackSeconds, skipForwardSeconds } = useSettings();
  const local = !!np?.isLocal;

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const session = navigator.mediaSession;
    if (!np || !local) {
      session.metadata = null;
      session.playbackState = 'none';
      return;
    }
    session.metadata = new MediaMetadata({
      title: np.name,
      artist: np.showName,
      album: 'Spoticast',
      artwork: np.image
        ? [{ src: np.image, sizes: '300x300', type: 'image/jpeg' }]
        : [],
    });
    session.playbackState = np.paused ? 'paused' : 'playing';
    try {
      session.setPositionState({
        duration: np.durationMs / 1000,
        position: Math.min(np.durationMs, np.positionMs) / 1000,
        playbackRate: 1,
      });
    } catch {
      // Unsupported or inconsistent values: the position just won't show.
    }
  }, [np, local]);

  useEffect(() => {
    if (!('mediaSession' in navigator) || !local) return;
    const session = navigator.mediaSession;
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => void togglePlay()],
      ['pause', () => void togglePlay()],
      ['seekbackward', (d) => void skip(-(d.seekOffset ?? skipBackSeconds))],
      ['seekforward', (d) => void skip(d.seekOffset ?? skipForwardSeconds)],
      [
        'seekto',
        (d) => d.seekTime !== undefined && void seekTo(d.seekTime * 1000),
      ],
      ['nexttrack', () => void next()],
    ];
    for (const [action, handler] of handlers) {
      try {
        session.setActionHandler(action, handler);
      } catch {
        // Action not supported by this browser.
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          session.setActionHandler(action, null);
        } catch {
          // ignore
        }
      }
    };
  }, [local, skipBackSeconds, skipForwardSeconds]);
}

/** Starts the player, device polling and the Up Next playlist; renders nothing. */
export function PlayerRuntime() {
  useEffect(() => {
    void initPlayer();
    const stopPolling = startPolling();
    ensureQueuePlaylist()
      .then(() => pruneFinishedFromQueue())
      .catch(() => undefined);
    return stopPolling;
  }, []);
  useMediaSession();
  return null;
}

export default PlayerRuntime;
