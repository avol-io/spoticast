import { Pause, Play, RotateCcw, RotateCw } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import IconButton from '../../app/ui/icon-button';
import { useDominantColor } from '../../lib/color/dominant';
import { useSettings } from '../../lib/storage/settings';
import { skip, togglePlay } from './player-controller';
import { usePlayer } from './player-store';
import { usePlaybackPosition } from './use-position';

export function MiniPlayer() {
  const { t } = useTranslation();
  const np = usePlayer((s) => s.nowPlaying);
  const setFullPlayerOpen = usePlayer((s) => s.setFullPlayerOpen);
  const { skipBackSeconds, skipForwardSeconds } = useSettings();
  const position = usePlaybackPosition();
  const accent = useDominantColor(np?.image);
  if (!np) return null;

  const progress = np.durationMs ? (position / np.durationMs) * 100 : 0;

  return (
    <div
      style={accent ? ({ '--accent': accent } as CSSProperties) : undefined}
      className="mx-2 mb-2 overflow-hidden rounded-2xl bg-[color-mix(in_oklab,var(--accent)_22%,var(--surface-2))] shadow-2xl ring-1 ring-black/10 backdrop-blur-md lg:mx-0 lg:mb-0 lg:rounded-none lg:border-t lg:border-border"
    >
      <div className="h-0.5 bg-black/20">
        <div
          className="h-full bg-accent transition-[width] duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center gap-2 p-2 pr-2.5 lg:mx-auto lg:max-w-6xl lg:px-8 lg:py-2.5">
        <button
          type="button"
          onClick={() => setFullPlayerOpen(true)}
          aria-label={`${t('player.open')}: ${np.name}`}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          {np.image ? (
            <img
              src={np.image}
              alt=""
              className="size-11 shrink-0 rounded-lg object-cover shadow lg:size-12"
            />
          ) : (
            <div className="size-11 shrink-0 rounded-lg bg-surface-3" />
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">
              {np.name}
            </span>
            <span className="block truncate text-xs text-fg-muted">
              {np.isLocal
                ? np.showName
                : t('player.playingOn', { name: np.deviceName })}
            </span>
          </span>
        </button>
        <IconButton
          label={t('player.skipBack', { count: skipBackSeconds })}
          className="hidden sm:inline-flex"
          onClick={() => void skip(-skipBackSeconds)}
        >
          <RotateCcw />
        </IconButton>
        <button
          type="button"
          aria-label={np.paused ? t('player.play') : t('player.pause')}
          onClick={() => void togglePlay()}
          className="inline-flex size-11 items-center justify-center rounded-full bg-fg text-bg transition-transform active:scale-90"
        >
          {np.paused ? (
            <Play className="ml-0.5 size-5 fill-current" />
          ) : (
            <Pause className="size-5 fill-current" />
          )}
        </button>
        <IconButton
          label={t('player.skipForward', { count: skipForwardSeconds })}
          onClick={() => void skip(skipForwardSeconds)}
        >
          <RotateCw />
        </IconButton>
      </div>
    </div>
  );
}

export default MiniPlayer;
