import i18n from '../../i18n';
import { queryClient } from '../../lib/query/query-client';
import { getAccessToken } from '../../lib/spotify/auth';
import { SpotifyApiError } from '../../lib/spotify/client';
import {
  getDevices,
  getEpisode,
  getPlaybackState,
  pausePlayback,
  seekPlayback,
  skipToNext,
  startPlayback,
  transferPlayback,
} from '../../lib/spotify/endpoints';
import type { Episode } from '../../lib/spotify/types';
import { toast } from '../../lib/storage/toasts';
import { libraryKeys } from '../library/queries';
import {
  ensureQueuePlaylist,
  moveToHead,
  queueKey,
  removeFromQueue,
  type QueueData,
} from '../queue/queue';
import {
  currentPosition,
  finishedEpisode,
  fromApiState,
  fromSdkState,
  pickSpotifyAppDevice,
  type NowPlaying,
} from './playback';
import { usePlayer } from './player-store';
import {
  MAX_ARCHIVE_ATTEMPTS,
  useArchiveStore,
} from '../archive/archive-store';
import {
  syncNextArchived,
  type ArchiveSyncDeps,
} from '../archive/archive-sync';
import { IS_BETA } from '../../lib/build-info';
import { loadPlaybackSdk } from './sdk';

export const LOCAL_DEVICE_NAME = IS_BETA ? 'Spoticast Beta' : 'Spoticast';

let player: Spotify.Player | null = null;
let lastFinished: { uri: string; at: number } | null = null;

// Archive sync (see features/archive): while it silently plays an episode
// tail, SDK events must not reach the UI; any user command takes over.
let archiveSyncing = false;
let userActed = false;
let volumeBeforeSync = 1;
let uiBeforeSync: NowPlaying | null = null;

function userAction() {
  userActed = true;
  if (archiveSyncing) {
    archiveSyncing = false;
    void player?.setVolume(volumeBeforeSync);
  }
}

// --- State ------------------------------------------------------------------

function onEpisodeFinished(uri: string) {
  // The SDK event and the API poll can both report the same ending.
  if (lastFinished?.uri === uri && Date.now() - lastFinished.at < 60_000)
    return;
  lastFinished = { uri, at: Date.now() };
  void removeFromQueue(uri, { silent: true }).catch(() => undefined);
  // Resume points changed: refresh badges and lists.
  void queryClient.invalidateQueries({ queryKey: libraryKeys.episodes() });
}

export function setNowPlaying(next: NowPlaying | null) {
  if (archiveSyncing) return;
  const prev = usePlayer.getState().nowPlaying;
  usePlayer.setState({ nowPlaying: next });
  const finished = finishedEpisode(prev, next);
  if (finished) onEpisodeFinished(finished);
}

function patchNowPlaying(patch: Partial<NowPlaying>) {
  const np = usePlayer.getState().nowPlaying;
  if (np)
    usePlayer.setState({
      nowPlaying: { ...np, ...patch, updatedAt: Date.now() },
    });
}

// --- Errors -----------------------------------------------------------------

function reportPlaybackError(error: unknown) {
  if (error instanceof SpotifyApiError) {
    if (error.status === 403 && error.reason === 'PREMIUM_REQUIRED') {
      toast(i18n.t('player.premiumRequired'), { tone: 'error' });
      return;
    }
    if (error.status === 404) {
      toast(i18n.t('player.noDevice'), { tone: 'error' });
      return;
    }
  }
  toast(i18n.t('errors.generic'), { tone: 'error' });
}

async function guarded(action: () => Promise<void>) {
  try {
    await action();
  } catch (error) {
    reportPlaybackError(error);
  } finally {
    schedulePoll(1500);
  }
}

// --- SDK --------------------------------------------------------------------

export async function initPlayer() {
  if (player || usePlayer.getState().sdkStatus === 'loading') return;
  usePlayer.setState({ sdkStatus: 'loading' });
  try {
    await loadPlaybackSdk();
  } catch {
    usePlayer.setState({ sdkStatus: 'unavailable' });
    return;
  }

  const instance = new window.Spotify.Player({
    name: LOCAL_DEVICE_NAME,
    getOAuthToken: (cb) => void getAccessToken().then(cb, () => undefined),
    volume: 1,
  });
  player = instance;

  instance.addListener('ready', ({ device_id }) => {
    usePlayer.setState({ sdkStatus: 'ready', localDeviceId: device_id });
  });
  instance.addListener('not_ready', () => {
    usePlayer.setState({ sdkStatus: 'loading' });
  });
  instance.addListener('player_state_changed', (state) => {
    const { localDeviceId, nowPlaying } = usePlayer.getState();
    if (state && localDeviceId) {
      setNowPlaying(fromSdkState(state, localDeviceId, LOCAL_DEVICE_NAME));
    } else if (nowPlaying?.isLocal) {
      // Playback left this browser: find out where it went.
      schedulePoll(500);
    }
  });
  instance.addListener('account_error', (e) => {
    usePlayer.setState({
      sdkStatus: 'error',
      sdkError: 'player.premiumRequired',
      sdkErrorDetail: e.message,
    });
  });
  instance.addListener('initialization_error', (e) => {
    usePlayer.setState({
      sdkStatus: 'unavailable',
      sdkError: 'player.sdkError',
      sdkErrorDetail: e.message,
    });
  });
  instance.addListener('authentication_error', (e) => {
    usePlayer.setState({
      sdkStatus: 'error',
      sdkError: 'player.sdkError',
      sdkErrorDetail: e.message,
    });
  });
  instance.addListener('playback_error', (e) => {
    toast(i18n.t('player.sdkError', { message: e.message }), { tone: 'error' });
  });

  await instance.connect();
}

// --- Polling (other devices) -------------------------------------------------

let pollTimer: ReturnType<typeof setTimeout> | undefined;

async function poll() {
  const { localDeviceId, nowPlaying } = usePlayer.getState();
  // The SDK pushes local state; only ask the API about other devices.
  if (!(nowPlaying?.isLocal && !nowPlaying.paused)) {
    try {
      const state = await getPlaybackState();
      const next = fromApiState(state, localDeviceId);
      if (!next?.isLocal) setNowPlaying(next);
    } catch {
      // Offline or rate limited: try again later.
    }
  }
  schedulePoll();
}

function schedulePoll(delay?: number) {
  clearTimeout(pollTimer);
  const np = usePlayer.getState().nowPlaying;
  const interval = document.hidden
    ? 60_000
    : np && !np.isLocal && !np.paused
      ? 10_000
      : 20_000;
  pollTimer = setTimeout(() => void poll(), delay ?? interval);
}

export function startPolling() {
  schedulePoll(0);
  const onVisibility = () => !document.hidden && schedulePoll(0);
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    clearTimeout(pollTimer);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

// --- Commands ---------------------------------------------------------------

/** Device to start playback on: where it's already playing, else this browser. */
async function targetDevice(): Promise<string | undefined> {
  const { nowPlaying, localDeviceId } = usePlayer.getState();
  if (nowPlaying?.deviceId) return nowPlaying.deviceId;
  if (localDeviceId) return localDeviceId;
  const devices = await getDevices();
  return (devices.find((d) => d.is_active) ?? devices[0])?.id ?? undefined;
}

/**
 * Plays an episode Pocket Casts style: it moves to the head of Up Next and
 * the Spoticast playlist plays from there, so the queue continues after it.
 */
export function playEpisode(episode: Episode): Promise<void> {
  userAction();
  // iOS only lets audio start inside the user gesture.
  void player?.activateElement();
  const np = usePlayer.getState().nowPlaying;
  if (np?.uri === episode.uri) return togglePlay();
  return guarded(async () => {
    await moveToHead(episode);
    const playlistId = await ensureQueuePlaylist();
    const resume = episode.resume_point;
    await startPlayback({
      deviceId: await targetDevice(),
      contextUri: `spotify:playlist:${playlistId}`,
      offsetUri: episode.uri,
      positionMs:
        resume && !resume.fully_played ? resume.resume_position_ms : 0,
    });
  });
}

export function togglePlay(): Promise<void> {
  userAction();
  void player?.activateElement();
  const np = usePlayer.getState().nowPlaying;
  if (!np) {
    const head = queryClient.getQueryData<QueueData>(queueKey)?.episodes[0];
    return head ? playEpisode(head) : Promise.resolve();
  }
  if (np.isLocal && player) {
    patchNowPlaying({ paused: !np.paused, positionMs: currentPosition(np) });
    return player.togglePlay();
  }
  return guarded(async () => {
    patchNowPlaying({ paused: !np.paused, positionMs: currentPosition(np) });
    if (np.paused) await startPlayback({ deviceId: np.deviceId ?? undefined });
    else await pausePlayback(np.deviceId ?? undefined);
  });
}

export function seekTo(positionMs: number) {
  userAction();
  const np = usePlayer.getState().nowPlaying;
  if (!np) return Promise.resolve();
  const clamped = Math.max(0, Math.min(np.durationMs - 1000, positionMs));
  patchNowPlaying({ positionMs: clamped });
  if (np.isLocal && player) return player.seek(clamped);
  return guarded(() => seekPlayback(clamped, np.deviceId ?? undefined));
}

export function skip(seconds: number) {
  const np = usePlayer.getState().nowPlaying;
  return np ? seekTo(currentPosition(np) + seconds * 1000) : Promise.resolve();
}

/** Skips to the next queued episode; the skipped one leaves Up Next. */
export function next() {
  userAction();
  const np = usePlayer.getState().nowPlaying;
  if (!np) return Promise.resolve();
  const skipped = np.uri;
  return guarded(async () => {
    if (np.isLocal && player) await player.nextTrack();
    else await skipToNext(np.deviceId ?? undefined);
    await removeFromQueue(skipped, { silent: true });
  });
}

export function pause() {
  const np = usePlayer.getState().nowPlaying;
  if (!np || np.paused) return Promise.resolve();
  return togglePlay();
}

export function transferTo(deviceId: string) {
  userAction();
  void player?.activateElement();
  const np = usePlayer.getState().nowPlaying;
  return guarded(() => transferPlayback(deviceId, !!np && !np.paused));
}

/**
 * "Continue in Spotify": hands playback to the Spotify app (keeping the
 * position) and opens the app on the Spoticast playlist.
 */
export async function switchToSpotify(playlistId: string) {
  userAction();
  const { localDeviceId, nowPlaying } = usePlayer.getState();
  try {
    const preferMobile = window.matchMedia('(pointer: coarse)').matches;
    const device = pickSpotifyAppDevice(
      await getDevices(),
      localDeviceId,
      preferMobile,
    );
    if (device?.id && device.id !== nowPlaying?.deviceId) {
      await transferPlayback(device.id, !!nowPlaying);
      toast(i18n.t('player.switchedTo', { name: device.name }));
    }
  } catch (error) {
    reportPlaybackError(error);
  }
  schedulePoll(1500);
  const webUrl = `https://open.spotify.com/playlist/${playlistId}`;
  // Without the app installed the deep link does nothing: fall back to web.
  const fallback = setTimeout(() => {
    if (!document.hidden) window.open(webUrl, '_blank', 'noopener');
  }, 1200);
  document.addEventListener('visibilitychange', () => clearTimeout(fallback), {
    once: true,
  });
  window.location.href = `spotify:playlist:${playlistId}`;
}

// --- Archive sync -------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Resolves when the SDK reports `uri` ended (or moved on), or on timeout. */
function waitForSdk(
  done: (state: Spotify.PlaybackState, seen: boolean) => boolean,
  uri: string,
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve) => {
    let seen = false;
    const finish = () => {
      clearTimeout(timer);
      clearInterval(abortCheck);
      player?.removeListener('player_state_changed', onState);
      resolve();
    };
    const onState = (state: Spotify.PlaybackState | null) => {
      if (!state) return;
      if (state.track_window.current_track?.uri === uri) seen = true;
      if (done(state, seen)) finish();
    };
    const timer = setTimeout(finish, timeoutMs);
    const abortCheck = setInterval(() => userActed && finish(), 200);
    player?.addListener('player_state_changed', onState);
  });
}

export function archiveSyncDeps(): ArchiveSyncDeps {
  const local = () => usePlayer.getState().localDeviceId;
  return {
    pending: () => Object.values(useArchiveStore.getState().pending),
    isIdle: async () => {
      const { sdkStatus, nowPlaying } = usePlayer.getState();
      if (!player || sdkStatus !== 'ready' || !local()) return false;
      if (nowPlaying && !nowPlaying.paused) return false;
      const state = await getPlaybackState().catch(() => undefined);
      return !state?.is_playing;
    },
    snapshot: () => {
      const np = usePlayer.getState().nowPlaying;
      return np
        ? {
            contextUri: np.contextUri,
            uri: np.uri,
            positionMs: currentPosition(np),
          }
        : null;
    },
    getVolume: async () => {
      volumeBeforeSync = (await player?.getVolume()) ?? 1;
      return volumeBeforeSync;
    },
    setVolume: async (volume) => {
      await player?.setVolume(volume);
    },
    playSilently: (uri, positionMs) =>
      startPlayback({ deviceId: local(), uris: [uri], positionMs }),
    waitForEnd: (uri, timeoutMs) =>
      waitForSdk(
        (state, seen) =>
          seen &&
          (state.track_window.current_track?.uri !== uri ||
            state.position >= state.duration - 500 ||
            (state.paused && state.position === 0)),
        uri,
        timeoutMs,
      ),
    pause: async () => {
      await player?.pause();
    },
    restore: async (snapshot) => {
      await startPlayback({
        deviceId: local(),
        ...(snapshot.contextUri
          ? { contextUri: snapshot.contextUri, offsetUri: snapshot.uri }
          : { uris: [snapshot.uri] }),
        positionMs: snapshot.positionMs,
      });
      await waitForSdk(
        (state) => state.track_window.current_track?.uri === snapshot.uri,
        snapshot.uri,
        4000,
      );
      await player?.pause();
    },
    verify: async (id) => {
      // Resume points take a moment to update server-side.
      await sleep(2500);
      return !!(await getEpisode(id)).resume_point?.fully_played;
    },
    markSynced: (id) => {
      useArchiveStore.getState().markSynced(id);
      void queryClient.invalidateQueries({ queryKey: libraryKeys.episodes() });
    },
    markAttempt: (id) => {
      useArchiveStore.getState().markAttempt(id);
      const entry = useArchiveStore.getState().pending[id];
      if (entry && entry.attempts >= MAX_ARCHIVE_ATTEMPTS) {
        toast(i18n.t('archive.syncFailed', { name: entry.name }), {
          tone: 'error',
        });
      }
    },
    aborted: () => userActed,
    setSyncing: (syncing) => {
      if (syncing) {
        userActed = false;
        uiBeforeSync = usePlayer.getState().nowPlaying;
        archiveSyncing = true;
      } else if (archiveSyncing) {
        archiveSyncing = false;
        // Show what was loaded before, not the silently completed episode.
        usePlayer.setState({
          nowPlaying: uiBeforeSync
            ? { ...uiBeforeSync, paused: true, updatedAt: Date.now() }
            : null,
        });
      }
      usePlayer.setState({ archiveSyncing: syncing });
    },
  };
}

let archiveRun: Promise<void> | null = null;

/** Completes pending archived episodes one by one while the player is idle. */
export function runArchiveSync(): Promise<void> {
  archiveRun ??= (async () => {
    for (;;) {
      if (document.hidden) break;
      const result = await syncNextArchived(archiveSyncDeps());
      if (result !== 'synced' && result !== 'retry') break;
      await sleep(1000);
    }
  })().finally(() => {
    archiveRun = null;
  });
  return archiveRun;
}
