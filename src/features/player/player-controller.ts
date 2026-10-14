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
import { usePositions } from '../../lib/storage/positions';
import { useSettings } from '../../lib/storage/settings';
import { toast } from '../../lib/storage/toasts';
import { libraryKeys } from '../library/queries';
import {
  ensureQueuePlaylist,
  moveToHead,
  playlistUri,
  prependToQueue,
  queueKey,
  pruneFinishedFromQueue,
  queueSettled,
  removeFromQueue,
  removeManyFromQueue,
  type QueueData,
} from '../queue/queue';
import { queueDrift, upcoming } from '../queue/queue-sync';
import {
  currentPosition,
  finishedEpisode,
  fromApiState,
  fromSdkState,
  pickPlaybackDevice,
  pickSpotifyAppDevice,
  type NowPlaying,
} from './playback';
import { usePlayer } from './player-store';
import { syncArchive } from '../archive/archive-playlist';
import {
  MAX_ARCHIVE_ATTEMPTS,
  useArchiveStore,
} from '../archive/archive-store';
import {
  syncNextArchived,
  type ArchiveSyncDeps,
} from '../archive/archive-sync';
import {
  diag,
  type DiagData,
  shortDevice,
  shortId,
  shortName,
} from '../../lib/diagnostics/log';
import { loadPlaybackSdk } from './sdk';
import { localDeviceName } from '../../lib/device-name';

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
    diag('archive', 'silent sync interrupted');
    archiveSyncing = false;
    void player?.setVolume(volumeBeforeSync);
  }
}

// --- State ------------------------------------------------------------------

/** What plays, compact, for the diagnostics log. */
const npLog = (np: NowPlaying | null) =>
  np
    ? {
        ep: shortId(np.uri),
        name: shortName(np.name),
        paused: np.paused,
        pos: Math.round(np.positionMs / 1000),
        device: shortDevice(np.deviceId),
        local: np.isLocal,
        upNext: inUpNext(np),
      }
    : { ep: null };

const errorLog = (error: unknown) =>
  error instanceof SpotifyApiError
    ? { status: error.status, reason: error.reason, message: error.message }
    : error instanceof Error
      ? { name: error.name, message: error.message }
      : { message: String(error) };

function onEpisodeFinished(uri: string) {
  // The SDK event and the API poll can both report the same ending.
  if (lastFinished?.uri === uri && Date.now() - lastFinished.at < 60_000)
    return;
  lastFinished = { uri, at: Date.now() };
  diag('player', 'finished', { ep: shortId(uri) });
  usePositions.getState().forget(uri);
  void removeFromQueue(uri, { silent: true }).catch(() => undefined);
  // Resume points changed: refresh badges and lists.
  void queryClient.invalidateQueries({ queryKey: libraryKeys.episodes() });
}

/** Remembers where an episode is, for its next start (see startPosition). */
function savePosition(np: NowPlaying | null, now = Date.now()) {
  if (np?.type !== 'episode') return;
  usePositions.getState().remember(np.uri, currentPosition(np, now));
}

/** Remembers where playback is: the app may not run again until reopened. */
export function savePlaybackPosition() {
  savePosition(usePlayer.getState().nowPlaying);
}

export function setNowPlaying(
  next: NowPlaying | null,
  source: 'sdk' | 'api' = 'api',
) {
  if (archiveSyncing) return;
  const prev = usePlayer.getState().nowPlaying;
  if (prev && prev.uri !== next?.uri) savePosition(prev, next?.updatedAt);
  if (next?.paused) savePosition(next);
  if (
    prev?.uri !== next?.uri ||
    prev?.paused !== next?.paused ||
    prev?.deviceId !== next?.deviceId ||
    prev?.isLocal !== next?.isLocal ||
    prev?.contextUri !== next?.contextUri
  )
    diag('player', 'state', { src: source, ...npLog(next) });
  usePlayer.setState({ nowPlaying: next });
  const finished = finishedEpisode(prev, next);
  if (finished) onEpisodeFinished(finished);
  if (prev && next && prev.uri !== next.uri && inUpNext(next)) {
    // The device moved on by itself (end, or skipped in another app): the
    // episode it left is done with. A start of ours keeps it queued.
    const ours = next.uri === expectedStart;
    diag('player', 'moved on', {
      from: shortId(prev.uri),
      to: shortId(next.uri),
      ours,
    });
    if (ours) expectedStart = null;
    else if (inUpNext(prev))
      void removeFromQueue(prev.uri, { silent: true }).catch(() => undefined);
    onUpNextTransition(prev.uri);
  }
}

function patchNowPlaying(patch: Partial<NowPlaying>) {
  const np = usePlayer.getState().nowPlaying;
  if (!np) return;
  const next = { ...np, ...patch, updatedAt: Date.now() };
  usePlayer.setState({ nowPlaying: next });
  if (next.paused) savePosition(next);
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
    diag('cmd', 'failed', errorLog(error));
    reportPlaybackError(error);
  } finally {
    schedulePoll(1500);
  }
}

// --- SDK --------------------------------------------------------------------

export async function initPlayer() {
  if (player || usePlayer.getState().sdkStatus === 'loading') return;
  usePlayer.setState({ sdkStatus: 'loading' });
  diag('sdk', 'init');
  try {
    await loadPlaybackSdk();
  } catch (error) {
    diag('sdk', 'load failed', errorLog(error));
    usePlayer.setState({ sdkStatus: 'unavailable' });
    return;
  }

  // Fixed for the session: a new name applies at the next start.
  const name = localDeviceName(useSettings.getState().deviceName);
  usePlayer.setState({ localDeviceName: name });
  const instance = new window.Spotify.Player({
    name,
    getOAuthToken: (cb) => void getAccessToken().then(cb, () => undefined),
    volume: 1,
  });
  player = instance;

  instance.addListener('ready', ({ device_id }) => {
    diag('sdk', 'ready', { device: shortDevice(device_id) });
    usePlayer.setState({ sdkStatus: 'ready', localDeviceId: device_id });
    // First run: this browser is the default device.
    const settings = useSettings.getState();
    if (!settings.preferredDevice)
      settings.setPreferredDevice({ kind: 'local' });
  });
  instance.addListener('not_ready', ({ device_id }) => {
    diag('sdk', 'not ready', { device: shortDevice(device_id) });
    usePlayer.setState({ sdkStatus: 'loading' });
    // This browser left Spotify Connect: ask where playback is.
    if (usePlayer.getState().nowPlaying?.isLocal) {
      patchNowPlaying({ isLocal: false });
      schedulePoll(0);
    }
  });
  instance.addListener('player_state_changed', (state) => {
    const { localDeviceId, nowPlaying } = usePlayer.getState();
    if (state && localDeviceId) {
      setNowPlaying(fromSdkState(state, localDeviceId, name), 'sdk');
    } else if (nowPlaying?.isLocal) {
      diag('sdk', 'state lost', { hasState: !!state });
      // Playback left this browser: find out where it went.
      schedulePoll(500);
    }
  });
  instance.addListener('account_error', (e) => {
    diag('sdk', 'account error', { message: e.message });
    usePlayer.setState({
      sdkStatus: 'error',
      sdkError: 'player.premiumRequired',
      sdkErrorDetail: e.message,
    });
  });
  instance.addListener('initialization_error', (e) => {
    diag('sdk', 'initialization error', { message: e.message });
    usePlayer.setState({
      sdkStatus: 'unavailable',
      sdkError: 'player.sdkError',
      sdkErrorDetail: e.message,
    });
  });
  instance.addListener('authentication_error', (e) => {
    diag('sdk', 'authentication error', { message: e.message });
    usePlayer.setState({
      sdkStatus: 'error',
      sdkError: 'player.sdkError',
      sdkErrorDetail: e.message,
    });
  });
  instance.addListener('playback_error', (e) => {
    diag('sdk', 'playback error', { message: e.message });
    toast(i18n.t('player.sdkError', { message: e.message }), { tone: 'error' });
  });

  await instance.connect();
}

let reconnecting: Promise<string | undefined> | null = null;

/** Resolves with `pick(state)` once defined, or undefined on timeout. */
function waitForPlayer<T>(
  pick: (state: ReturnType<typeof usePlayer.getState>) => T | undefined,
  timeoutMs: number,
): Promise<T | undefined> {
  return new Promise((resolve) => {
    const check = () => {
      const value = pick(usePlayer.getState());
      if (value === undefined) return false;
      clearTimeout(timer);
      unsubscribe();
      resolve(value);
      return true;
    };
    const timer = setTimeout(() => {
      unsubscribe();
      resolve(undefined);
    }, timeoutMs);
    const unsubscribe = usePlayer.subscribe(() => void check());
    check();
  });
}

/** Resolves with the SDK device id once ready, or undefined on timeout. */
const waitForSdkReady = (timeoutMs: number) =>
  waitForPlayer(
    (s) => (s.sdkStatus === 'ready' ? s.localDeviceId : undefined),
    timeoutMs,
  );

/**
 * Connects this browser's player to Spotify again (iOS drops it in the
 * background without telling): it comes back with a new device id.
 */
export function reconnectSdk(): Promise<string | undefined> {
  if (!player) return Promise.resolve(undefined);
  const sdk = player;
  reconnecting ??= (async () => {
    diag('sdk', 'reconnect', {
      device: shortDevice(usePlayer.getState().localDeviceId),
    });
    usePlayer.setState({ sdkStatus: 'loading', localDeviceId: undefined });
    sdk.disconnect();
    const ready = waitForSdkReady(10_000);
    await sdk.connect();
    const id = await ready;
    diag('sdk', id ? 'reconnected' : 'reconnect timed out', {
      device: shortDevice(id),
    });
    return id;
  })().finally(() => {
    reconnecting = null;
  });
  return reconnecting;
}

/** True when Spotify still lists this browser's player. */
async function sdkRegistered(): Promise<boolean> {
  const { localDeviceId, sdkStatus } = usePlayer.getState();
  if (!player || sdkStatus !== 'ready' || !localDeviceId) {
    diag('sdk', 'registered', { result: false, sdkStatus });
    return false;
  }
  if (await player.getCurrentState().catch(() => null)) {
    diag('sdk', 'registered', { result: true, via: 'sdk state' });
    return true;
  }
  const devices = await getDevices().catch(() => null);
  // Can't tell (offline): leave it alone.
  const result = !devices || devices.some((d) => d.id === localDeviceId);
  diag('sdk', 'registered', {
    result,
    via: devices ? 'devices' : 'offline',
    devices: devices?.length,
  });
  return result;
}

/**
 * Runs a command on `deviceId`. When Spotify no longer knows that device
 * (404), it reconnects this browser if it was the one lost, picks the
 * preferred available device and tries once more.
 */
async function onLiveDevice(
  deviceId: string | undefined,
  run: (deviceId: string | undefined) => Promise<void>,
): Promise<void> {
  try {
    await run(deviceId);
  } catch (error) {
    if (!(error instanceof SpotifyApiError && error.status === 404))
      throw error;
    const devices = await getDevices();
    const { localDeviceId } = usePlayer.getState();
    const localLost = !devices.some((d) => d.id === localDeviceId);
    diag('cmd', 'device not found', {
      device: shortDevice(deviceId),
      devices: devices.length,
      localLost,
    });
    if (player && localLost) await reconnectSdk();
    const picked = pickPlaybackDevice(
      useSettings.getState().preferredDevice,
      devices.filter((d) => d.id !== deviceId),
      usePlayer.getState().localDeviceId,
    );
    if (!picked || picked.deviceId === deviceId) {
      diag('cmd', 'no device to retry on');
      throw error;
    }
    diag('cmd', 'retry', { device: shortDevice(picked.deviceId) });
    await run(picked.deviceId);
  }
}

// --- Polling (other devices) -------------------------------------------------

let pollTimer: ReturnType<typeof setTimeout> | undefined;

async function poll() {
  const { nowPlaying } = usePlayer.getState();
  // The SDK pushes local state while it plays, if it is still connected.
  const sdkState =
    nowPlaying?.isLocal && player
      ? await player.getCurrentState().catch(() => null)
      : null;
  if (!(sdkState && !nowPlaying?.paused)) {
    try {
      const state = await getPlaybackState();
      const next = fromApiState(state, usePlayer.getState().localDeviceId);
      // Without SDK state, the API is the only truth (even about here).
      if (!next?.isLocal || !sdkState) setNowPlaying(next, 'api');
    } catch (error) {
      // Offline or rate limited: try again later.
      diag('api', 'poll failed', errorLog(error));
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

/** Polls the playback state; `resumeSync` polls again on return. */
export function startPolling() {
  schedulePoll(0);
  return () => clearTimeout(pollTimer);
}

/** Below this, a trip to the background can't have broken anything. */
const RESUME_CHECK_MS = 5_000;

/**
 * Back from the background (see lib/pwa/foreground): nothing ran meanwhile,
 * so refresh the token, reconnect this browser's player if Spotify dropped
 * it, re-read where playback is, and refresh devices and Up Next.
 */
export async function resumeSync({
  hiddenMs,
  reason,
}: {
  hiddenMs: number;
  reason?: string;
}) {
  const startedAt = Date.now();
  diag('life', 'resume sync', {
    reason,
    hiddenS: Number.isFinite(hiddenMs)
      ? Math.round(hiddenMs / 1000)
      : 'unknown',
    archiveSyncing,
  });
  if (archiveSyncing) return;
  try {
    await getAccessToken();
  } catch (error) {
    // Offline: the "online" event brings us back here.
    diag('life', 'resume sync: no token', errorLog(error));
    return;
  }
  if (hiddenMs >= RESUME_CHECK_MS && player && !(await sdkRegistered()))
    await reconnectSdk();
  clearTimeout(pollTimer);
  await poll();
  void queryClient.invalidateQueries({ queryKey: ['devices'] });
  await queryClient.invalidateQueries({ queryKey: queueKey });
  await pruneFinishedFromQueue().catch(() => undefined);
  await removePassedEpisodes();
  await syncArchive().catch(() => undefined);
  diag('life', 'resume sync done', { ms: Date.now() - startedAt });
}

/** Drops what the device played past while the app was away. */
async function removePassedEpisodes() {
  const np = usePlayer.getState().nowPlaying;
  if (!loadedOrder || !inUpNext(np)) return;
  const index = loadedOrder.indexOf(np.uri);
  if (index <= 0) return;
  diag('queue', 'remove passed', { count: index });
  await removeManyFromQueue(loadedOrder.slice(0, index), {
    silent: true,
  }).catch(() => undefined);
}

// --- Commands ---------------------------------------------------------------

/**
 * Picks the branch for where playback is: this browser through the Web
 * Playback SDK (`local`) or another Spotify Connect device (`remote`). Every
 * command that acts on the current playback goes through here.
 */
function onTarget<T>(
  np: NowPlaying,
  command: string,
  branches: {
    local: (sdk: Spotify.Player) => T;
    remote: (deviceId: string | undefined) => T;
  },
  details?: DiagData,
): T {
  diag('cmd', command, {
    target: np.isLocal && player ? 'local' : 'remote',
    device: shortDevice(np.deviceId),
    ep: shortId(np.uri),
    paused: np.paused,
    ...details,
  });
  return np.isLocal && player
    ? branches.local(player)
    : branches.remote(np.deviceId ?? undefined);
}

/** How long a start waits for this browser's player to connect. */
const SDK_START_WAIT_MS = 5_000;

/**
 * Device to start playback on: where something is loaded, else the
 * preferred device (saving the default when there is no preference yet).
 */
async function targetDevice(): Promise<string | undefined> {
  const { nowPlaying, sdkStatus } = usePlayer.getState();
  let { localDeviceId } = usePlayer.getState();
  if (nowPlaying?.deviceId) {
    diag('cmd', 'target device', {
      device: shortDevice(nowPlaying.deviceId),
      why: 'loaded',
    });
    return nowPlaying.deviceId;
  }
  const { preferredDevice, setPreferredDevice } = useSettings.getState();
  const wantsLocal = !preferredDevice || preferredDevice.kind === 'local';
  let waitedMs: number | undefined;
  // Just opened or reconnecting: wait for this browser rather than start
  // on whatever other device comes first.
  if (wantsLocal && !localDeviceId && sdkStatus === 'loading') {
    const startedAt = Date.now();
    localDeviceId = await waitForSdkReady(SDK_START_WAIT_MS);
    waitedMs = Date.now() - startedAt;
  }
  const localWins = wantsLocal && !!localDeviceId;
  const devices = localWins ? [] : await getDevices();
  const picked = pickPlaybackDevice(preferredDevice, devices, localDeviceId);
  diag('cmd', 'target device', {
    device: shortDevice(picked?.deviceId),
    why: localWins
      ? 'local'
      : preferredDevice?.kind === 'local'
        ? 'fallback'
        : 'preferred',
    preferred: preferredDevice?.kind ?? null,
    devices: devices.length,
    waitedMs,
  });
  if (picked && !preferredDevice) setPreferredDevice(picked.preference);
  return picked?.deviceId;
}

// --- Up Next sync -------------------------------------------------------------
// A device keeps the Up Next order it loaded with the playlist context (see
// features/queue/queue-sync), on the SDK and on Connect alike: when the queue
// changes under it, the context is started again where it is.

/** Up Next as the device loaded it; null until known. */
let loadedOrder: string[] | null = null;
/** Up Next changed: reload at the next episode change or resume. */
let queueDirty = false;
/** Context starts in flight: their state events are not drift. */
let starting = 0;
/** Episode our last start asked for: reaching it is not the device moving on. */
let expectedStart: string | null = null;
let reconcileTimer: ReturnType<typeof setTimeout> | undefined;

const queueEpisodes = () =>
  queryClient.getQueryData<QueueData>(queueKey)?.episodes;

const inUpNext = (np: NowPlaying | null): np is NowPlaying =>
  !!np?.contextUri && np.contextUri === playlistUri();

const START_POSITION_TIMEOUT_MS = 1500;

/**
 * Where to start `episode`. Cached episodes can be days old, so the resume
 * point is read fresh; Spotify saves it with a delay, so where this app last
 * saw the episode wins when further on.
 */
async function startPosition(episode: Episode): Promise<number> {
  const fresh = await Promise.race([
    getEpisode(episode.id).catch(() => null),
    sleep(START_POSITION_TIMEOUT_MS).then(() => null),
  ]);
  const resume = (fresh ?? episode).resume_point;
  const saved = usePositions.getState().positions[episode.uri];
  const remote = resume && !resume.fully_played ? resume.resume_position_ms : 0;
  const position = resume?.fully_played ? 0 : Math.max(remote, saved?.ms ?? 0);
  diag('queue', 'start position', {
    ep: shortId(episode.uri),
    fresh: !!fresh,
    remote: Math.round(remote / 1000),
    saved: saved ? Math.round(saved.ms / 1000) : null,
    done: !!resume?.fully_played,
  });
  return position;
}

/** Plays Up Next from `uri`, remembering the order the device loads. */
async function startUpNext(options: {
  deviceId: string | undefined;
  uri: string;
  positionMs: number;
}) {
  const playlistId = await ensureQueuePlaylist();
  await queueSettled();
  starting++;
  try {
    const order = (queueEpisodes() ?? []).map((ep) => ep.uri);
    expectedStart = options.uri;
    diag('queue', 'start up next', {
      ep: shortId(options.uri),
      pos: Math.round(options.positionMs / 1000),
      device: shortDevice(options.deviceId),
      order: order.length,
    });
    await onLiveDevice(options.deviceId, (deviceId) =>
      startPlayback({
        deviceId,
        contextUri: `spotify:playlist:${playlistId}`,
        offsetUri: options.uri,
        positionMs: options.positionMs,
      }),
    );
    loadedOrder = order;
    queueDirty = false;
  } finally {
    starting--;
  }
}

/** Reloads the context on the current episode, keeping the position. */
const reloadUpNext = (np: NowPlaying) =>
  guarded(() =>
    startUpNext({
      deviceId: np.deviceId ?? undefined,
      uri: np.uri,
      positionMs: currentPosition(np),
    }),
  );

function reconcileQueue() {
  const np = usePlayer.getState().nowPlaying;
  const episodes = queueEpisodes();
  if (archiveSyncing || !inUpNext(np) || !episodes) return;
  if (starting) return scheduleReconcile();
  const queue = episodes.map((ep) => ep.uri);
  // Already playing when the app opened: assume it loaded the current order.
  if (!loadedOrder) {
    diag('queue', 'assume loaded order', { count: queue.length });
    loadedOrder = queue;
    return;
  }
  const drift = queueDrift(loadedOrder, queue, np.uri);
  if (drift === 'none') {
    queueDirty = false;
    return;
  }
  queueDirty = true;
  // Only a changed next episode can't wait; a removed current one can't be
  // reloaded on: the next episode change takes care of both.
  const reload = drift === 'now' && !np.paused && queue.includes(np.uri);
  diag('queue', 'drift', { drift, paused: np.paused, reload });
  if (reload) void reloadUpNext(np);
}

function scheduleReconcile() {
  clearTimeout(reconcileTimer);
  reconcileTimer = setTimeout(
    () => void queueSettled().then(reconcileQueue),
    2000,
  );
}

/**
 * The device moved on from `prevUri` with a stale order: start what Up Next
 * has after it, or reload the right episode with the new order.
 */
function onUpNextTransition(prevUri: string) {
  if (!queueDirty || starting) return;
  // The finished episode is being removed: wait for it.
  void queueSettled().then(() => {
    const np = usePlayer.getState().nowPlaying;
    const episodes = queueEpisodes();
    if (archiveSyncing || starting || !inUpNext(np) || !episodes) return;
    const queue = episodes.map((ep) => ep.uri);
    const wanted = upcoming(queue, prevUri)[0];
    if (!wanted) {
      diag('queue', 'transition: end of Up Next');
      void pause();
    } else if (wanted !== np.uri) {
      const episode = episodes.find((ep) => ep.uri === wanted);
      if (!episode) return;
      diag('queue', 'transition: wrong episode', {
        playing: shortId(np.uri),
        wanted: shortId(wanted),
      });
      void guarded(async () =>
        startUpNext({
          deviceId: np.deviceId ?? undefined,
          uri: wanted,
          positionMs: await startPosition(episode),
        }),
      );
    } else if (
      !loadedOrder ||
      queueDrift(loadedOrder, queue, np.uri) !== 'none'
    ) {
      diag('queue', 'transition: reload order');
      void reloadUpNext(np);
    } else {
      queueDirty = false;
    }
  });
}

/** Keeps the device in line with Up Next edits; returns the cleanup. */
export function watchQueue() {
  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (
      event.type === 'updated' &&
      event.action.type === 'success' &&
      event.query.queryKey[0] === queueKey[0]
    )
      scheduleReconcile();
  });
  return () => {
    unsubscribe();
    clearTimeout(reconcileTimer);
  };
}

/** Controller state for a feedback report (see features/feedback). */
export function playerDiagnostics() {
  return {
    sdk: !!player,
    loadedOrder: loadedOrder
      ? `${loadedOrder.length}: ${loadedOrder.slice(0, 5).map(shortId).join(',')}`
      : null,
    queueDirty,
    starting,
    expectedStart: shortId(expectedStart),
    userActed,
    archiveSyncing,
    reconnecting: !!reconnecting,
  };
}

/** Test hook: forget what the device loaded. */
export function resetQueueSync() {
  loadedOrder = null;
  queueDirty = false;
  starting = 0;
  expectedStart = null;
  clearTimeout(reconcileTimer);
}

/** How long a start may take to show up as playing. */
const LAUNCH_SETTLE_MS = 5_000;

/** A start from the user not playing yet: nothing is loaded meanwhile. */
let launching: Promise<void> | null = null;

function launch(action: () => Promise<void>): Promise<void> {
  let started = false;
  const run = guarded(async () => {
    await action();
    started = true;
  });
  launching = run;
  // The device takes a few seconds to report the start.
  void run
    .then(() =>
      started
        ? waitForPlayer((s) => s.nowPlaying ?? undefined, LAUNCH_SETTLE_MS)
        : undefined,
    )
    .finally(() => {
      if (launching === run) launching = null;
    });
  return run;
}

/**
 * Plays an episode: it moves to the head of Up Next and
 * the Spoticast playlist plays from there, so the queue continues after it.
 * It starts at `positionMs` when given (moved before playing), else where
 * it was left.
 */
export function playEpisode(
  episode: Episode,
  { positionMs }: { positionMs?: number } = {},
): Promise<void> {
  userAction();
  // iOS only lets audio start inside the user gesture.
  void player?.activateElement();
  diag('cmd', 'play episode', {
    ep: shortId(episode.uri),
    name: shortName(episode.name),
  });
  const np = usePlayer.getState().nowPlaying;
  if (np?.uri === episode.uri) return togglePlay();
  return launch(async () => {
    const start = positionMs ?? startPosition(episode);
    await moveToHead(episode);
    await startUpNext({
      deviceId: await targetDevice(),
      uri: episode.uri,
      positionMs: await start,
    });
  });
}

/** Most episodes "Play all" puts in Up Next (one playlist write). */
export const PLAY_ALL_LIMIT = 100;

/** Puts `episodes` at the head of Up Next and plays the first one. */
export function playAll(episodes: Episode[]): Promise<void> {
  userAction();
  void player?.activateElement();
  const head = episodes.slice(0, PLAY_ALL_LIMIT);
  diag('cmd', 'play all', {
    count: episodes.length,
    first: shortId(head[0]?.uri),
  });
  if (!head.length) return Promise.resolve();
  if (episodes.length > head.length)
    toast(i18n.t('smart.playAllLimited', { count: PLAY_ALL_LIMIT }));
  return launch(async () => {
    const start = startPosition(head[0]);
    await prependToQueue(head);
    await startUpNext({
      deviceId: await targetDevice(),
      uri: head[0].uri,
      positionMs: await start,
    });
  });
}

export function togglePlay(): Promise<void> {
  userAction();
  void player?.activateElement();
  const np = usePlayer.getState().nowPlaying;
  if (!np) {
    if (launching) {
      diag('cmd', 'toggle: start in flight');
      return launching;
    }
    const head = queryClient.getQueryData<QueueData>(queueKey)?.episodes[0];
    diag('cmd', 'toggle: nothing loaded', { head: shortId(head?.uri) });
    return head ? playEpisode(head) : Promise.resolve();
  }
  patchNowPlaying({ paused: !np.paused, positionMs: currentPosition(np) });
  // Up Next changed while paused: resume with the new order.
  if (np.paused && queueDirty && inUpNext(np)) {
    diag('cmd', 'resume with new order', { ep: shortId(np.uri) });
    return reloadUpNext(np);
  }
  return onTarget(np, np.paused ? 'resume' : 'pause', {
    // Not a toggle: a repeated command (lock screen) must not undo itself.
    local: (sdk) => (np.paused ? sdk.resume() : sdk.pause()),
    remote: (deviceId) =>
      guarded(async () => {
        if (!np.paused) return pausePlayback(deviceId);
        const { uri } = np;
        const positionMs = currentPosition(np);
        const upNext = inUpNext(np);
        // A device that disappeared has nothing loaded: start it over.
        await onLiveDevice(deviceId, (id) =>
          id === deviceId
            ? startPlayback({ deviceId: id })
            : upNext
              ? startUpNext({ deviceId: id, uri, positionMs })
              : startPlayback({ deviceId: id, uris: [uri], positionMs }),
        );
      }),
  });
}

export function seekTo(positionMs: number) {
  userAction();
  const np = usePlayer.getState().nowPlaying;
  if (!np) return Promise.resolve();
  const clamped = Math.max(0, Math.min(np.durationMs - 1000, positionMs));
  patchNowPlaying({ positionMs: clamped });
  return onTarget(
    np,
    'seek',
    {
      local: (sdk) => sdk.seek(clamped),
      remote: (deviceId) => guarded(() => seekPlayback(clamped, deviceId)),
    },
    { to: Math.round(clamped / 1000) },
  );
}

export function skip(seconds: number) {
  const np = usePlayer.getState().nowPlaying;
  return np ? seekTo(currentPosition(np) + seconds * 1000) : Promise.resolve();
}

const nextInQueue = (uri: string) => {
  const episodes = queueEpisodes() ?? [];
  const wanted = upcoming(
    episodes.map((ep) => ep.uri),
    uri,
  )[0];
  return episodes.find((ep) => ep.uri === wanted) ?? null;
};

/** Skips to the next queued episode; the skipped one leaves Up Next. */
export function next() {
  userAction();
  const np = usePlayer.getState().nowPlaying;
  if (!np) return Promise.resolve();
  const skipped = np.uri;
  // With a stale order the device would skip to the wrong episode.
  const following = queueDirty && inUpNext(np) ? nextInQueue(np.uri) : null;
  if (following) {
    diag('cmd', 'next: restart order', {
      from: shortId(skipped),
      to: shortId(following.uri),
    });
    return guarded(async () => {
      await startUpNext({
        deviceId: np.deviceId ?? undefined,
        uri: following.uri,
        positionMs: await startPosition(following),
      });
      await removeFromQueue(skipped, { silent: true });
    });
  }
  return guarded(async () => {
    await onTarget(np, 'next', {
      local: (sdk) => sdk.nextTrack(),
      remote: (deviceId) => skipToNext(deviceId),
    });
    await removeFromQueue(skipped, { silent: true });
  });
}

export function pause() {
  const np = usePlayer.getState().nowPlaying;
  if (!np || np.paused) return Promise.resolve();
  return togglePlay();
}

export function resume() {
  const np = usePlayer.getState().nowPlaying;
  if (np && !np.paused) return Promise.resolve();
  return togglePlay();
}

export function transferTo(deviceId: string) {
  userAction();
  void player?.activateElement();
  const np = usePlayer.getState().nowPlaying;
  const play = !!np && !np.paused;
  diag('cmd', 'transfer', { device: shortDevice(deviceId), play });
  return guarded(async () => {
    // "This browser" may have lost its id in the background.
    const { localDeviceId } = usePlayer.getState();
    const target =
      deviceId === localDeviceId && player && !(await sdkRegistered())
        ? await reconnectSdk()
        : deviceId;
    await onLiveDevice(target, (id) =>
      id ? transferPlayback(id, play) : Promise.reject(new Error('no device')),
    );
  });
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
    diag('cmd', 'switch to Spotify', {
      device: shortDevice(device?.id),
      type: device?.type,
    });
    if (device?.id && device.id !== nowPlaying?.deviceId) {
      await transferPlayback(device.id, !!nowPlaying);
      toast(i18n.t('player.switchedTo', { name: device.name }));
    }
  } catch (error) {
    diag('cmd', 'failed', errorLog(error));
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
    alreadyDone: async (id) =>
      !!(await getEpisode(id)).resume_point?.fully_played,
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
      diag('archive', syncing ? 'silent sync start' : 'silent sync end');
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
    // Other open devices share the archive: don't all start at once.
    await sleep(Math.random() * 3000);
    for (;;) {
      if (document.hidden) break;
      const result = await syncNextArchived(archiveSyncDeps());
      if (result !== 'idle' && result !== 'busy')
        diag('archive', 'silent sync', { result });
      if (result !== 'synced' && result !== 'retry') break;
      await sleep(1000);
    }
  })().finally(() => {
    archiveRun = null;
  });
  return archiveRun;
}
