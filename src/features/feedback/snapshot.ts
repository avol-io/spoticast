import i18n from '../../i18n';
import { shortDevice, shortId, shortName } from '../../lib/diagnostics/log';
import type { Snapshot } from '../../lib/diagnostics/report';
import { useUpdate } from '../../lib/pwa/update';
import { isStandalone } from '../../lib/pwa/install';
import { queryClient } from '../../lib/query/query-client';
import { useAuth } from '../../lib/spotify/auth';
import type { Device } from '../../lib/spotify/types';
import { useSettings } from '../../lib/storage/settings';
import { currentPosition } from '../player/playback';
import { playerDiagnostics } from '../player/player-controller';
import { usePlayer } from '../player/player-store';
import { playlistUri, queueKey, type QueueData } from '../queue/queue';
import { useQueueStore } from '../queue/queue-store';

const seconds = (ms: number) => Math.round(ms / 1000);

const deviceLabel = (d: Pick<Device, 'id' | 'name' | 'type'>) =>
  `${d.name} (${d.type}) ${shortDevice(d.id) ?? '-'}`;

/**
 * State of the app for a feedback report. No tokens: only whether one is
 * there and when it expires.
 */
export function collectSnapshot(now = Date.now()): Snapshot {
  const player = usePlayer.getState();
  const np = player.nowPlaying;
  const { tokens } = useAuth.getState();
  const { theme, preferredDevice } = useSettings.getState();
  const devices = queryClient.getQueryState<Device[]>(['devices']);
  const queue = queryClient.getQueryState<QueueData>(queueKey);

  return {
    env: {
      userAgent: navigator.userAgent,
      standalone: isStandalone(),
      online: navigator.onLine,
      visibility: document.visibilityState,
      language: `${navigator.language} (app ${i18n.language})`,
      theme,
      serviceWorker: !!navigator.serviceWorker?.controller,
      updateWaiting: useUpdate.getState().needRefresh,
    },
    player: {
      sdkStatus: player.sdkStatus,
      sdkError: player.sdkError ?? null,
      sdkErrorDetail: player.sdkErrorDetail ?? null,
      localDevice: shortDevice(player.localDeviceId),
      archiveSyncing: player.archiveSyncing,
      nowPlaying: np
        ? {
            ep: shortId(np.uri),
            name: shortName(np.name),
            show: shortName(np.showName),
            type: np.type,
            paused: np.paused,
            posS: seconds(currentPosition(np, now)),
            durationS: seconds(np.durationMs),
            device: `${np.deviceName} ${shortDevice(np.deviceId) ?? '-'}`,
            local: np.isLocal,
            context: shortId(np.contextUri),
            inUpNext: !!np.contextUri && np.contextUri === playlistUri(),
            observedAgoS: seconds(now - np.updatedAt),
          }
        : null,
    },
    controller: playerDiagnostics(),
    devices: {
      list: devices?.data?.map(
        (d) => `${deviceLabel(d)}${d.is_active ? ' active' : ''}`,
      ) ?? ['not loaded'],
      fetchedAgoS: devices?.dataUpdatedAt
        ? seconds(now - devices.dataUpdatedAt)
        : null,
      preferred:
        preferredDevice?.kind === 'remote'
          ? deviceLabel(preferredDevice)
          : (preferredDevice?.kind ?? null),
    },
    upNext: {
      playlist: useQueueStore.getState().playlistId,
      count: queue?.data?.episodes.length ?? null,
      head: queue?.data?.episodes.slice(0, 10).map((ep) => ep.id) ?? [],
      fetchedAgoS: queue?.dataUpdatedAt
        ? seconds(now - queue.dataUpdatedAt)
        : null,
      status: queue?.status ?? null,
    },
    auth: {
      token: !!tokens,
      expiresInS: tokens ? seconds(tokens.expiresAt - now) : null,
    },
  };
}
