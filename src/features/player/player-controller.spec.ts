import { clearLog, snapshotLog } from '../../lib/diagnostics/log';
import { queryClient } from '../../lib/query/query-client';
import { SpotifyApiError } from '../../lib/spotify/client';
import * as endpoints from '../../lib/spotify/endpoints';
import type { Device, Episode } from '../../lib/spotify/types';
import { useSettings } from '../../lib/storage/settings';
import {
  moveInQueue,
  queueKey,
  resetQueuePlaylistCache,
  type QueueData,
} from '../queue/queue';
import { useQueueStore } from '../queue/queue-store';
import type { NowPlaying } from './playback';
import {
  PLAY_ALL_LIMIT,
  playAll,
  playEpisode,
  resetQueueSync,
  seekTo,
  setNowPlaying,
  togglePlay,
  watchQueue,
} from './player-controller';
import { usePlayer } from './player-store';

const ep = (id: string) =>
  ({
    id,
    uri: `spotify:episode:${id}`,
    type: 'episode',
    resume_point: { fully_played: false, resume_position_ms: 5000 },
  }) as Episode;

const playing = (id: string, patch: Partial<NowPlaying> = {}): NowPlaying => ({
  uri: `spotify:episode:${id}`,
  id,
  type: 'episode',
  name: id,
  showName: 'Show',
  durationMs: 3_600_000,
  positionMs: 60_000,
  updatedAt: Date.now(),
  paused: false,
  contextUri: 'spotify:playlist:pl',
  // A Connect device: the sync must work without the SDK.
  deviceId: 'speaker',
  deviceName: 'Speaker',
  isLocal: false,
  video: false,
  ...patch,
});

describe('Up Next sync', () => {
  let play: ReturnType<typeof vi.spyOn>;
  let stopWatching: () => void;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    resetQueuePlaylistCache();
    resetQueueSync();
    useQueueStore.setState({ playlistId: 'pl', userId: 'me' });
    vi.spyOn(endpoints, 'libraryContains').mockResolvedValue([true]);
    vi.spyOn(endpoints, 'reorderPlaylistItem').mockResolvedValue({
      snapshot_id: 's',
    });
    vi.spyOn(endpoints, 'removePlaylistItems').mockResolvedValue({
      snapshot_id: 's',
    });
    // Keep the poll from replacing the state set by the tests.
    vi.spyOn(endpoints, 'getPlaybackState').mockReturnValue(
      new Promise(() => undefined),
    );
    play = vi.spyOn(endpoints, 'startPlayback').mockResolvedValue();
    vi.spyOn(endpoints, 'pausePlayback').mockResolvedValue();
    queryClient.setQueryData<QueueData>(queueKey, {
      episodes: [ep('a'), ep('b'), ep('c'), ep('d')],
      otherCount: 0,
    });
    usePlayer.setState({ nowPlaying: null, localDeviceId: undefined });
    stopWatching = watchQueue();
  });

  afterEach(() => {
    stopWatching();
    vi.useRealTimers();
    vi.restoreAllMocks();
    queryClient.clear();
  });

  /** Starts `a` on the speaker so the loaded order is known. */
  async function startA() {
    usePlayer.setState({ nowPlaying: playing('z') });
    await playEpisode(ep('a'));
    play.mockClear();
    usePlayer.setState({ nowPlaying: playing('a') });
  }

  it('reloads at once when the next episode changes while playing', async () => {
    await startA();
    await moveInQueue(2, 1);
    await vi.advanceTimersByTimeAsync(2500);
    expect(play).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: 'speaker',
        contextUri: 'spotify:playlist:pl',
        offsetUri: 'spotify:episode:a',
      }),
    );
  });

  it('waits for the next episode when only later ones change', async () => {
    await startA();
    await moveInQueue(3, 2);
    await vi.advanceTimersByTimeAsync(2500);
    expect(play).not.toHaveBeenCalled();

    // The device moves on to b with the old order: reload it on b.
    setNowPlaying(playing('b', { positionMs: 0 }));
    await vi.advanceTimersByTimeAsync(100);
    expect(play).toHaveBeenCalledWith(
      expect.objectContaining({ offsetUri: 'spotify:episode:b' }),
    );
  });

  it('resumes with the new order after a change while paused', async () => {
    await startA();
    usePlayer.setState({ nowPlaying: playing('a', { paused: true }) });
    await moveInQueue(2, 1);
    await vi.advanceTimersByTimeAsync(2500);
    expect(play).not.toHaveBeenCalled();

    await togglePlay();
    expect(play).toHaveBeenCalledWith(
      expect.objectContaining({
        contextUri: 'spotify:playlist:pl',
        offsetUri: 'spotify:episode:a',
        positionMs: 60_000,
      }),
    );
  });

  it('starts the episode Up Next wants when the device moved to another', async () => {
    await startA();
    usePlayer.setState({ nowPlaying: playing('a', { paused: true }) });
    await moveInQueue(2, 1);
    await vi.advanceTimersByTimeAsync(2500);

    // Resumed elsewhere and reached the end: the device picked b, not c.
    setNowPlaying(playing('b', { positionMs: 0 }));
    await vi.advanceTimersByTimeAsync(100);
    expect(play).toHaveBeenCalledWith(
      expect.objectContaining({
        offsetUri: 'spotify:episode:c',
        positionMs: 5000,
      }),
    );
  });

  it('drops the episode the device moved on from', async () => {
    const remove = vi.mocked(endpoints.removePlaylistItems);
    await startA();
    setNowPlaying(playing('b', { positionMs: 0 }));
    await vi.advanceTimersByTimeAsync(100);
    expect(remove).toHaveBeenCalledWith('pl', ['spotify:episode:a']);
  });

  it('keeps the episode the user switched away from', async () => {
    const remove = vi.mocked(endpoints.removePlaylistItems);
    await startA();
    await playEpisode(ep('c'));
    setNowPlaying(playing('c', { positionMs: 0 }));
    await vi.advanceTimersByTimeAsync(100);
    expect(remove).not.toHaveBeenCalled();
  });

  it('starts on another device when Spotify lost the target', async () => {
    useSettings.setState({ preferredDevice: null });
    vi.spyOn(endpoints, 'getDevices').mockResolvedValue([
      { id: 'phone', name: 'Pixel', type: 'Smartphone' } as Device,
    ]);
    await startA();
    play.mockRejectedValueOnce(new SpotifyApiError(404, 'Device not found'));
    await playEpisode(ep('b'));
    expect(play.mock.calls.map(([options]) => options.deviceId)).toEqual([
      'speaker',
      'phone',
    ]);
  });

  it('leaves the device alone when the order is unchanged', async () => {
    await startA();
    setNowPlaying(playing('b', { positionMs: 0 }));
    await vi.advanceTimersByTimeAsync(2500);
    expect(play).not.toHaveBeenCalled();
  });
});

describe('playAll', () => {
  beforeEach(() => {
    resetQueuePlaylistCache();
    resetQueueSync();
    useQueueStore.setState({ playlistId: 'pl', userId: 'me' });
    vi.spyOn(endpoints, 'libraryContains').mockResolvedValue([true]);
    vi.spyOn(endpoints, 'getPlaybackState').mockReturnValue(
      new Promise(() => undefined),
    );
    queryClient.setQueryData<QueueData>(queueKey, {
      episodes: [ep('a')],
      otherCount: 0,
    });
    usePlayer.setState({ nowPlaying: playing('a', { paused: true }) });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
    usePlayer.setState({ nowPlaying: null });
  });

  it('queues at most the limit and plays the first episode', async () => {
    const add = vi
      .spyOn(endpoints, 'addPlaylistItems')
      .mockResolvedValue({ snapshot_id: 's' });
    const play = vi.spyOn(endpoints, 'startPlayback').mockResolvedValue();
    const many = Array.from({ length: PLAY_ALL_LIMIT + 5 }, (_, i) =>
      ep(`e${i}`),
    );
    await playAll(many);
    expect(add.mock.calls[0][1]).toHaveLength(PLAY_ALL_LIMIT);
    expect(play).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: 'speaker',
        contextUri: 'spotify:playlist:pl',
        offsetUri: 'spotify:episode:e0',
        positionMs: 5000,
      }),
    );
  });
});

describe('diagnostics log', () => {
  beforeEach(() => {
    clearLog();
    vi.spyOn(endpoints, 'getPlaybackState').mockReturnValue(
      new Promise(() => undefined),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    usePlayer.setState({ nowPlaying: null });
  });

  it('logs commands sent to a Connect device', async () => {
    usePlayer.setState({ nowPlaying: playing('a') });
    vi.spyOn(endpoints, 'seekPlayback').mockResolvedValue();
    await seekTo(120_000);
    expect(snapshotLog()).toContainEqual(
      expect.objectContaining({
        a: 'cmd',
        e: 'seek',
        d: expect.objectContaining({
          target: 'remote',
          device: 'speaker',
          to: 120,
        }),
      }),
    );
  });

  it('logs the retry when the device is gone', async () => {
    usePlayer.setState({
      nowPlaying: playing('a', { paused: true, contextUri: null }),
    });
    vi.spyOn(endpoints, 'startPlayback')
      .mockRejectedValueOnce(new SpotifyApiError(404, 'Device not found'))
      .mockResolvedValue();
    vi.spyOn(endpoints, 'getDevices').mockResolvedValue([
      { id: 'phone', name: 'Phone', type: 'Smartphone' } as Device,
    ]);
    await togglePlay();
    const events = snapshotLog().map((entry) => [entry.e, entry.d?.device]);
    expect(events).toEqual(
      expect.arrayContaining([
        ['resume', 'speaker'],
        ['device not found', 'speaker'],
        ['retry', 'phone'],
      ]),
    );
  });
});
