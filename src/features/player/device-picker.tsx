import { useTranslation } from 'react-i18next';
import Popover from '../../app/ui/popover';
import type { DeviceType } from '../../lib/spotify/types';
import { useSettings } from '../../lib/storage/settings';
import DeviceList, { iconFor } from './device-list';
import { usePlayer } from './player-store';

/** The device in use (or preferred), opening the device list upwards. */
export function DevicePicker() {
  const { t } = useTranslation();
  const np = usePlayer((s) => s.nowPlaying);
  const sdkReady = usePlayer((s) => s.sdkStatus === 'ready');
  const preferred = useSettings((s) => s.preferredDevice);

  const thisDevice = { name: t('player.thisDevice'), type: 'Computer' };
  const device: { name: string; type: DeviceType } | null = np
    ? np.isLocal
      ? thisDevice
      : { name: np.deviceName, type: np.deviceType ?? 'Unknown' }
    : preferred?.kind === 'remote'
      ? preferred
      : preferred || sdkReady
        ? thisDevice
        : null;
  const Icon = iconFor(device?.type ?? 'Unknown');
  const label = device
    ? t('player.deviceLabel', { name: device.name })
    : t('player.chooseDevice');

  return (
    <Popover
      label={t('player.devices')}
      placement="top"
      className="w-72 max-w-[calc(100vw-2rem)] p-2"
      trigger={(props) => (
        <button
          type="button"
          aria-label={label}
          title={label}
          {...props}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <Icon className="size-5" aria-hidden />
          {device && (
            <span className="hidden max-w-28 truncate text-xs font-medium md:inline">
              {device.name}
            </span>
          )}
        </button>
      )}
    >
      {(close) => (
        <>
          <p className="px-3 pt-1 pb-2 text-xs font-semibold tracking-wider text-fg-subtle uppercase">
            {t('player.devices')}
          </p>
          <DeviceList onPicked={close} />
        </>
      )}
    </Popover>
  );
}

export default DevicePicker;
