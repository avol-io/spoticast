import { formatReport, reportJson } from '../../lib/diagnostics/report';
import { queryClient } from '../../lib/query/query-client';
import { useAuth } from '../../lib/spotify/auth';
import type { Device, Episode } from '../../lib/spotify/types';
import type { NowPlaying } from '../player/playback';
import { usePlayer } from '../player/player-store';
import { queueKey, type QueueData } from '../queue/queue';
import { useQueueStore } from '../queue/queue-store';
import { collectSnapshot } from './snapshot';

const now = Date.parse('2026-10-12T10:00:00Z');

describe('collectSnapshot', () => {
  beforeEach(() => {
    useAuth.setState({
      tokens: {
        accessToken: 'secret-access-token',
        refreshToken: 'secret-refresh-token',
        expiresAt: now + 600_000,
        scope: 'streaming',
      },
    });
    useQueueStore.setState({ playlistId: 'pl', userId: 'me' });
    usePlayer.setState({
      sdkStatus: 'ready',
      localDeviceId: 'web0123456789',
      nowPlaying: {
        uri: 'spotify:episode:a',
        id: 'a',
        type: 'episode',
        name: 'A very long episode title that goes on and on and on',
        showName: 'Show',
        durationMs: 3_600_000,
        positionMs: 60_000,
        updatedAt: now - 5000,
        paused: false,
        contextUri: 'spotify:playlist:pl',
        deviceId: 'web0123456789',
        deviceName: 'Spoticast',
        isLocal: true,
        video: false,
      } as NowPlaying,
    });
    queryClient.setQueryData<Device[]>(
      ['devices'],
      [
        {
          id: 'phone0123456789',
          name: 'Phone',
          type: 'Smartphone',
          is_active: true,
        } as Device,
      ],
    );
    queryClient.setQueryData<QueueData>(queueKey, {
      episodes: [{ id: 'a' }, { id: 'b' }] as Episode[],
      otherCount: 0,
    });
  });

  afterEach(() => {
    queryClient.clear();
    usePlayer.setState({ nowPlaying: null, localDeviceId: undefined });
  });

  it('describes the player, devices and Up Next', () => {
    const snapshot = collectSnapshot(now);
    expect(snapshot.player).toMatchObject({
      sdkStatus: 'ready',
      localDevice: 'web01234',
      nowPlaying: {
        ep: 'a',
        name: 'A very long episode title that goes on …',
        posS: 65,
        local: true,
        inUpNext: true,
      },
    });
    expect(snapshot.devices.list).toEqual([
      'Phone (Smartphone) phone012 active',
    ]);
    expect(snapshot.upNext).toMatchObject({
      playlist: 'pl',
      count: 2,
      head: ['a', 'b'],
    });
    expect(snapshot.auth).toEqual({ token: true, expiresInS: 600 });
  });

  it('never carries the tokens', () => {
    const report = {
      description: '',
      capturedAt: now,
      snapshot: collectSnapshot(now),
      entries: [],
    };
    for (const text of [formatReport(report, 100_000), reportJson(report)]) {
      expect(text).not.toContain('secret-access-token');
      expect(text).not.toContain('secret-refresh-token');
    }
  });
});
