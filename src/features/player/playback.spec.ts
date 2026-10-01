import type { Device, Episode, PlaybackState } from '../../lib/spotify/types';
import {
  currentPosition,
  finishedEpisode,
  fromApiState,
  fromSdkState,
  pickSpotifyAppDevice,
  type NowPlaying,
} from './playback';

const np = (overrides: Partial<NowPlaying> = {}): NowPlaying => ({
  uri: 'spotify:episode:a',
  id: 'a',
  type: 'episode',
  name: 'A',
  showName: 'Show',
  durationMs: 600_000,
  positionMs: 0,
  updatedAt: 1_000_000,
  paused: false,
  contextUri: null,
  deviceId: 'd',
  deviceName: 'Web',
  isLocal: true,
  video: false,
  ...overrides,
});

describe('fromSdkState', () => {
  it('maps the current episode and its show', () => {
    const state = {
      paused: true,
      position: 1234,
      duration: 600_000,
      context: { uri: 'spotify:playlist:q', metadata: null },
      track_window: {
        current_track: {
          uri: 'spotify:episode:e1',
          id: 'e1',
          name: 'Ep',
          type: 'episode',
          media_type: 'video',
          duration_ms: 1,
          album: {
            name: 'My Show',
            uri: 'spotify:show:s1',
            images: [{ url: 'img', width: 300 }],
          },
          artists: [],
        },
      },
    } as unknown as Spotify.PlaybackState;
    expect(fromSdkState(state, 'dev', 'Spoticast', 5)).toMatchObject({
      uri: 'spotify:episode:e1',
      showName: 'My Show',
      showId: 's1',
      image: 'img',
      positionMs: 1234,
      paused: true,
      isLocal: true,
      video: true,
      contextUri: 'spotify:playlist:q',
    });
  });

  it('returns null without a track', () => {
    expect(fromSdkState(null, 'dev', 'x')).toBeNull();
  });
});

describe('fromApiState', () => {
  it('maps a remote episode', () => {
    const state = {
      device: { id: 'phone', name: 'Pixel' },
      is_playing: true,
      progress_ms: 10,
      context: null,
      item: {
        type: 'episode',
        uri: 'spotify:episode:e',
        id: 'e',
        name: 'Ep',
        duration_ms: 100,
        images: [],
        show: { id: 's', name: 'Show', images: [], media_type: 'audio' },
      } as unknown as Episode,
    } as unknown as PlaybackState;
    expect(fromApiState(state, 'web', 7)).toMatchObject({
      isLocal: false,
      deviceName: 'Pixel',
      paused: false,
      showId: 's',
      video: false,
    });
    expect(fromApiState(undefined, 'web')).toBeNull();
  });
});

describe('currentPosition', () => {
  it('extrapolates while playing and freezes while paused', () => {
    expect(currentPosition(np({ positionMs: 1000 }), 1_002_000)).toBe(3000);
    expect(
      currentPosition(np({ positionMs: 1000, paused: true }), 1_002_000),
    ).toBe(1000);
    expect(currentPosition(np({ positionMs: 599_000 }), 1_010_000)).toBe(
      600_000,
    );
  });
});

describe('finishedEpisode', () => {
  const nearEnd = np({ positionMs: 590_000 });

  it('detects the switch to the next episode after the end', () => {
    expect(
      finishedEpisode(
        nearEnd,
        np({ uri: 'spotify:episode:b', updatedAt: 1_000_500 }),
      ),
    ).toBe('spotify:episode:a');
  });

  it('detects the end of the context (reset to start, paused)', () => {
    expect(
      finishedEpisode(
        nearEnd,
        np({ paused: true, positionMs: 0, updatedAt: 1_011_000 }),
      ),
    ).toBe('spotify:episode:a');
    expect(finishedEpisode(nearEnd, null)).toBe('spotify:episode:a');
  });

  it('extrapolates the previous position to the time of the change', () => {
    const playing = np({ positionMs: 500_000 });
    expect(
      finishedEpisode(
        playing,
        np({ uri: 'spotify:episode:b', updatedAt: 1_080_000 }),
      ),
    ).toBe('spotify:episode:a');
  });

  it('ignores skips in the middle and plain pauses', () => {
    expect(
      finishedEpisode(
        np({ positionMs: 100_000 }),
        np({ uri: 'spotify:episode:b' }),
      ),
    ).toBeNull();
    expect(
      finishedEpisode(nearEnd, np({ paused: true, positionMs: 591_000 })),
    ).toBeNull();
    expect(
      finishedEpisode(np({ type: 'track', positionMs: 599_000 }), null),
    ).toBeNull();
  });
});

describe('pickSpotifyAppDevice', () => {
  const device = (id: string, type: string, extra: Partial<Device> = {}) =>
    ({
      id,
      type,
      name: id,
      is_active: false,
      is_restricted: false,
      ...extra,
    }) as Device;
  const devices = [
    device('web', 'Computer'),
    device('mac', 'Computer'),
    device('phone', 'Smartphone'),
  ];

  it('skips this browser and prefers the platform device type', () => {
    expect(pickSpotifyAppDevice(devices, 'web', true)?.id).toBe('phone');
    expect(pickSpotifyAppDevice(devices, 'web', false)?.id).toBe('mac');
  });

  it('falls back to the active device', () => {
    expect(
      pickSpotifyAppDevice(
        [device('tv', 'TV'), device('spk', 'Speaker', { is_active: true })],
        'web',
        true,
      )?.id,
    ).toBe('spk');
    expect(
      pickSpotifyAppDevice([device('web', 'Computer')], 'web', false),
    ).toBeUndefined();
  });
});
