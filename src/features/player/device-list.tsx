import { useQuery } from '@tanstack/react-query';
import { Laptop, Monitor, Smartphone, Speaker, Tablet, Tv } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getDevices } from '../../lib/spotify/endpoints';
import type { DeviceType } from '../../lib/spotify/types';
import { LOCAL_DEVICE_NAME, transferTo } from './player-controller';
import { usePlayer } from './player-store';

const icons: Record<string, typeof Laptop> = {
  Computer: Laptop,
  Smartphone,
  Tablet,
  Speaker,
  TV: Tv,
  CastVideo: Tv,
  CastAudio: Speaker,
};

const iconFor = (type: DeviceType) => icons[type] ?? Monitor;

/** Spotify Connect devices; tapping one moves playback there. */
export function DeviceList({ onPicked }: { onPicked?: () => void }) {
  const { t } = useTranslation();
  const { localDeviceId, sdkStatus, sdkError, sdkErrorDetail, nowPlaying } =
    usePlayer();
  const devices = useQuery({
    queryKey: ['devices'],
    queryFn: getDevices,
    staleTime: 0,
    refetchInterval: 10_000,
  });

  const others = (devices.data ?? []).filter(
    (d) => d.id && d.id !== localDeviceId,
  );
  const activeId =
    nowPlaying?.deviceId ?? devices.data?.find((d) => d.is_active)?.id;
  const entries = [
    ...(localDeviceId && sdkStatus === 'ready'
      ? [
          {
            id: localDeviceId,
            name: t('player.thisDevice'),
            detail: LOCAL_DEVICE_NAME,
            type: 'Computer',
          },
        ]
      : []),
    ...others.map((d) => ({
      id: d.id as string,
      name: d.name,
      detail: d.type,
      type: d.type,
    })),
  ];

  return (
    <div className="flex flex-col gap-1">
      {sdkError && (
        <p className="mb-2 rounded-xl bg-danger/15 px-3 py-2 text-sm text-danger">
          {t(sdkError, { message: sdkErrorDetail ?? '' })}
        </p>
      )}
      <ul className="flex flex-col gap-1">
        {entries.map((d) => {
          const Icon = iconFor(d.type);
          const active = d.id === activeId;
          return (
            <li key={d.id}>
              <button
                type="button"
                aria-current={active}
                onClick={() => {
                  if (!active) void transferTo(d.id);
                  onPicked?.();
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  active ? 'bg-accent/20 text-accent-ink' : 'hover:bg-surface-3'
                }`}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{d.name}</span>
                  <span className="block truncate text-xs opacity-70">
                    {d.detail}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {devices.isSuccess && others.length === 0 && (
        <p className="px-3 py-2 text-sm text-fg-muted">
          {t('player.noOtherDevices')}
        </p>
      )}
    </div>
  );
}

export default DeviceList;
