import { queryClient } from '../../lib/query/query-client';
import * as endpoints from '../../lib/spotify/endpoints';
import type { Episode } from '../../lib/spotify/types';
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
