import { useEffect } from 'react';
import { useSettings } from '../../lib/storage/settings';
import { useArchiveStore } from '../archive/archive-store';
import { ensureQueuePlaylist, pruneFinishedFromQueue } from '../queue/queue';
import {
  initPlayer,
  next,
  runArchiveSync,
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

/**
 * Completes archived episodes on Spotify whenever the player is idle: when
 * something gets archived, playback pauses, the player connects, and every
 * 30 seconds as a fallback.
 */
function useArchiveSync() {
  const pendingCount = useArchiveStore((s) => Object.keys(s.pending).length);
  const sdkReady = usePlayer((s) => s.sdkStatus === 'ready');
  const paused = usePlayer((s) => s.nowPlaying?.paused ?? true);

  useEffect(() => {
    if (!pendingCount || !sdkReady || !paused) return;
    // Give a just-paused player a moment, in case the user resumes.
    const soon = setTimeout(() => void runArchiveSync(), 5000);
    const fallback = setInterval(() => void runArchiveSync(), 30_000);
    return () => {
      clearTimeout(soon);
      clearInterval(fallback);
    };
  }, [pendingCount, sdkReady, paused]);
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
  useArchiveSync();
  return null;
}

export default PlayerRuntime;
