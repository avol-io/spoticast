import { clearLog, snapshotLog } from '../../lib/diagnostics/log';
import { useAuth } from '../../lib/spotify/auth';
import * as endpoints from '../../lib/spotify/endpoints';
import type { Device, Episode, PlaybackState } from '../../lib/spotify/types';
import { queueKey, type QueueData } from '../queue/queue';
import { queryClient } from '../../lib/query/query-client';
import { useQueueStore } from '../queue/queue-store';
import * as archive from '../archive/archive-playlist';
import type { NowPlaying } from './playback';
import { useSettings } from '../../lib/storage/settings';
import {
  initPlayer,
  pause,
  playEpisode,
  resume,
  resumeSync,
  seekTo,
  togglePlay,
  transferTo,
} from './player-controller';
import { usePlayer } from './player-store';

/** Stand-in for the Web Playback SDK: each connect gets a new device id. */
class FakePlayer {
  static last: FakePlayer;
  private listeners = new Map<string, ((arg: unknown) => void)[]>();
  private connects = 0;
  state: unknown = null;
  constructor() {
    FakePlayer.last = this;
  }
  addListener(event: string, cb: (arg: unknown) => void) {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), cb]);
    return true;
  }
  removeListener() {
    return true;
  }
  emit(event: string, arg: unknown) {
    for (const cb of this.listeners.get(event) ?? []) cb(arg);
  }
  connect = vi.fn(async () => {
    this.connects++;
    this.emit('ready', { device_id: `web-${this.connects}` });
    return true;
  });
  disconnect = vi.fn();
  getCurrentState = vi.fn(async () => this.state);
  activateElement = vi.fn(async () => undefined);
  seek = vi.fn(async () => undefined);
  resume = vi.fn(async () => undefined);
  pause = vi.fn(async () => undefined);
  togglePlay = vi.fn(async () => undefined);
}

const device = (id: string, type = 'Smartphone') =>
  ({ id, name: id, type, is_active: false, is_restricted: false }) as Device;

describe('back from the background', () => {
  beforeAll(async () => {
    window.Spotify = { Player: FakePlayer } as unknown as typeof Spotify;
    await initPlayer();
  });

  beforeEach(() => {
    clearLog();
    useAuth.setState({
      tokens: {
        accessToken: 't',
        refreshToken: 'r',
        expiresAt: Date.now() + 3_600_000,
        scope: '',
      },
    });
    useQueueStore.setState({ playlistId: 'pl', userId: 'me' });
    queryClient.setQueryData<QueueData>(queueKey, {
      episodes: [],
      otherCount: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    usePlayer.setState({ nowPlaying: null });
  });

  it('reconnects the dropped player and shows where playback went', async () => {
    const lostId = usePlayer.getState().localDeviceId;
    // iOS froze the page while it played here; then the phone took over.
    usePlayer.setState({
      nowPlaying: {
        uri: 'spotify:episode:a',
        isLocal: true,
        paused: false,
        deviceId: lostId,
      } as NowPlaying,
    });
    vi.spyOn(endpoints, 'getDevices').mockResolvedValue([device('phone')]);
    vi.spyOn(endpoints, 'getPlaybackState').mockResolvedValue({
      device: device('phone'),
      is_playing: true,
      progress_ms: 1000,
      context: null,
      item: {
        type: 'episode',
        id: 'a',
        uri: 'spotify:episode:a',
        name: 'A',
        duration_ms: 60_000,
        images: [],
        show: { id: 's', name: 'Show', images: [], media_type: 'audio' },
      },
    } as unknown as PlaybackState);

    await resumeSync({ hiddenMs: 60_000, reason: 'visible' });

    expect(FakePlayer.last.disconnect).toHaveBeenCalled();
    expect(snapshotLog().map((entry) => entry.e)).toEqual(
      expect.arrayContaining([
        'resume sync',
        'registered',
        'reconnect',
        'reconnected',
        'resume sync done',
      ]),
    );
    expect(usePlayer.getState().localDeviceId).not.toBe(lostId);
    expect(usePlayer.getState().nowPlaying).toMatchObject({
      deviceId: 'phone',
      isLocal: false,
    });
  });

  it('leaves a player that is still connected alone', async () => {
    const id = usePlayer.getState().localDeviceId as string;
    vi.spyOn(endpoints, 'getDevices').mockResolvedValue([
      device(id, 'Computer'),
    ]);
    vi.spyOn(endpoints, 'getPlaybackState').mockResolvedValue(undefined);
    FakePlayer.last.disconnect.mockClear();
    await resumeSync({ hiddenMs: 60_000 });
    expect(FakePlayer.last.disconnect).not.toHaveBeenCalled();
    expect(usePlayer.getState().localDeviceId).toBe(id);
  });

  it('logs commands played in this browser', async () => {
    const id = usePlayer.getState().localDeviceId;
    usePlayer.setState({
      nowPlaying: {
        uri: 'spotify:episode:a',
        isLocal: true,
        paused: true,
        deviceId: id,
        durationMs: 3_600_000,
        positionMs: 0,
        updatedAt: Date.now(),
      } as NowPlaying,
    });
    await seekTo(30_000);
    expect(FakePlayer.last.seek).toHaveBeenCalledWith(30_000);
    expect(snapshotLog()).toContainEqual(
      expect.objectContaining({
        e: 'seek',
        d: expect.objectContaining({ target: 'local', to: 30 }),
      }),
    );
  });

  it('picks up what other devices archived', async () => {
    vi.spyOn(endpoints, 'getDevices').mockResolvedValue([]);
    vi.spyOn(endpoints, 'getPlaybackState').mockResolvedValue(undefined);
    const sync = vi.spyOn(archive, 'syncArchive').mockResolvedValue();
    await resumeSync({ hiddenMs: 1000 });
    expect(sync).toHaveBeenCalled();
  });

  it('moves playback to this browser even after it lost its id', async () => {
    const lostId = usePlayer.getState().localDeviceId as string;
    vi.spyOn(endpoints, 'getDevices').mockResolvedValue([device('phone')]);
    const transfer = vi
      .spyOn(endpoints, 'transferPlayback')
      .mockResolvedValue();
    await transferTo(lostId);
    const newId = usePlayer.getState().localDeviceId;
    expect(newId).not.toBe(lostId);
    expect(transfer).toHaveBeenCalledWith(newId, false);
  });

  describe('play and pause here', () => {
    const local = (paused: boolean) =>
      usePlayer.setState({
        nowPlaying: {
          uri: 'spotify:episode:a',
          isLocal: true,
          paused,
          deviceId: usePlayer.getState().localDeviceId,
          durationMs: 3_600_000,
          positionMs: 0,
          updatedAt: Date.now(),
        } as NowPlaying,
      });

    it('resumes and pauses explicitly, never toggles', async () => {
      local(true);
      await togglePlay();
      expect(FakePlayer.last.resume).toHaveBeenCalledTimes(1);
      local(false);
      await togglePlay();
      expect(FakePlayer.last.pause).toHaveBeenCalledTimes(1);
      expect(FakePlayer.last.togglePlay).not.toHaveBeenCalled();
    });

    it('ignores a repeated play while a stale state says paused', async () => {
      FakePlayer.last.pause.mockClear();
      local(true);
      await resume();
      // An old SDK event lands between two lock screen presses.
      local(true);
      await resume();
      expect(FakePlayer.last.pause).not.toHaveBeenCalled();
      await resume();
      await pause();
      expect(FakePlayer.last.pause).toHaveBeenCalledTimes(1);
    });
  });

  describe('starting before this browser is connected', () => {
    let readyId: string | undefined;
    let play: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      readyId = usePlayer.getState().localDeviceId;
      useSettings.setState({ preferredDevice: { kind: 'local' } });
      vi.spyOn(endpoints, 'libraryContains').mockResolvedValue([true]);
      vi.spyOn(endpoints, 'getPlaybackState').mockReturnValue(
        new Promise(() => undefined),
      );
      vi.spyOn(endpoints, 'getEpisode').mockRejectedValue(new Error('offline'));
      vi.spyOn(endpoints, 'getDevices').mockResolvedValue([
        device('other', 'Computer'),
      ]);
      play = vi.spyOn(endpoints, 'startPlayback').mockResolvedValue();
      queryClient.setQueryData<QueueData>(queueKey, {
        episodes: [{ id: 'a', uri: 'spotify:episode:a' } as Episode],
        otherCount: 0,
      });
      usePlayer.setState({ sdkStatus: 'loading', localDeviceId: undefined });
    });

    afterEach(() => {
      usePlayer.setState({ sdkStatus: 'ready', localDeviceId: readyId });
      vi.useRealTimers();
    });

    const episode = { id: 'a', uri: 'spotify:episode:a' } as Episode;

    it('waits for it instead of starting on another device', async () => {
      const started = playEpisode(episode);
      await vi.advanceTimersByTimeAsync(1000);
      usePlayer.setState({ sdkStatus: 'ready', localDeviceId: 'web-late' });
      await started;
      expect(play).toHaveBeenCalledWith(
        expect.objectContaining({ deviceId: 'web-late' }),
      );
      expect(snapshotLog()).toContainEqual(
        expect.objectContaining({
          e: 'target device',
          d: expect.objectContaining({ why: 'local' }),
        }),
      );
    });

    it('falls back to another device when it never connects', async () => {
      const started = playEpisode(episode);
      await vi.advanceTimersByTimeAsync(5000);
      await started;
      expect(play).toHaveBeenCalledWith(
        expect.objectContaining({ deviceId: 'other' }),
      );
      expect(snapshotLog()).toContainEqual(
        expect.objectContaining({
          e: 'target device',
          d: expect.objectContaining({ why: 'fallback' }),
        }),
      );
    });
  });
});
