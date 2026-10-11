import { useAuth } from '../../lib/spotify/auth';
import * as endpoints from '../../lib/spotify/endpoints';
import type { Device, PlaybackState } from '../../lib/spotify/types';
import { queueKey, type QueueData } from '../queue/queue';
import { queryClient } from '../../lib/query/query-client';
import { useQueueStore } from '../queue/queue-store';
import type { NowPlaying } from './playback';
import { initPlayer, resumeSync, transferTo } from './player-controller';
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
}

const device = (id: string, type = 'Smartphone') =>
  ({ id, name: id, type, is_active: false, is_restricted: false }) as Device;

describe('back from the background', () => {
  beforeAll(async () => {
    window.Spotify = { Player: FakePlayer } as unknown as typeof Spotify;
    await initPlayer();
  });

  beforeEach(() => {
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

    await resumeSync({ hiddenMs: 60_000 });

    expect(FakePlayer.last.disconnect).toHaveBeenCalled();
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
});
