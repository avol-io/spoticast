import { ListMusic, Pause, Play, RotateCcw, RotateCw } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import IconButton from '../../app/ui/icon-button';
import { useDominantColor } from '../../lib/color/dominant';
import { episodeProgress, pickImage } from '../../lib/episodes';
import { useSettings } from '../../lib/storage/settings';
import { useQueue } from '../queue/queue';
import DevicePicker from './device-picker';
import { COVER_TRANSITION, openFullPlayer } from './full-player-open';
import { skip, togglePlay } from './player-controller';
import { usePlayer } from './player-store';
import { usePlaybackPosition } from './use-position';

function Cover({ image, named }: { image?: string; named?: boolean }) {
  // Morphs into the full player cover (never both named at once).
  const style = named ? { viewTransitionName: COVER_TRANSITION } : undefined;
  return image ? (
    <img
      src={image}
      alt=""
      style={style}
      className="size-11 shrink-0 rounded-lg object-cover shadow lg:size-12"
    />
  ) : (
    <div
      style={style}
      className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-fg-muted lg:size-12"
    >
      <ListMusic className="size-5" aria-hidden />
    </div>
  );
}

function Titles({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <span className="min-w-0">
      <span className="block truncate text-sm font-semibold">{title}</span>
      <span className="block truncate text-xs text-fg">{subtitle}</span>
    </span>
  );
}

/**
 * Always visible: what is playing, else the head of Up Next ready to play,
 * else an empty bar. Tapping either opens the full player. The device picker opens upwards from it.
 */
export function MiniPlayer() {
  const { t } = useTranslation();
  const np = usePlayer((s) => s.nowPlaying);
  const fullPlayerOpen = usePlayer((s) => s.fullPlayerOpen);
  const { skipBackSeconds, skipForwardSeconds } = useSettings();
  const position = usePlaybackPosition();
  const queue = useQueue();
  const head = np ? undefined : queue.data?.episodes[0];
  const image = np
    ? np.image
    : head && pickImage(head.images?.length ? head.images : head.show.images);
  const accent = useDominantColor(image);

  const progress = np
    ? np.durationMs
      ? (position / np.durationMs) * 100
      : 0
    : head
      ? episodeProgress(head).fraction * 100
      : 0;
  const rowClass = 'flex min-w-0 flex-1 items-center gap-3 text-left';

  let info: ReactNode;
  if (np) {
    info = (
      <button type="button" onClick={openFullPlayer} className={rowClass}>
        <Cover image={np.image} named={!fullPlayerOpen} />
        <span className="sr-only">{t('player.open')}: </span>
        <Titles
          title={np.name}
          subtitle={
            np.isLocal
              ? np.showName
              : t('player.playingOn', { name: np.deviceName })
          }
        />
      </button>
    );
  } else if (head) {
    info = (
      <button type="button" onClick={openFullPlayer} className={rowClass}>
        <Cover image={image} named={!fullPlayerOpen} />
        <span className="sr-only">{t('player.open')}: </span>
        <Titles
          title={head.name}
          subtitle={`${t('player.upNext')} · ${head.show.name}`}
        />
      </button>
    );
  } else {
    info = (
      <div className={rowClass}>
        <Cover />
        <span className="truncate text-sm text-fg-muted">
          {t('player.nothingPlaying')}
        </span>
      </div>
    );
  }

  return (
    <div
      style={accent ? ({ '--accent': accent } as CSSProperties) : undefined}
      className="bg-player relative mx-2 mb-2 rounded-2xl shadow-2xl ring-1 ring-black/10 backdrop-blur-md lg:mx-0 lg:mb-0 lg:rounded-none lg:border-t lg:border-border"
    >
      {/* Inset by the corner radius, so it sits on the straight top edge. */}
      <div className="absolute inset-x-4 top-0 h-[3px] overflow-hidden rounded-full bg-black/20 lg:inset-x-0 lg:h-0.5 lg:rounded-none">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500 lg:rounded-none"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center gap-2 p-2 pr-2.5 lg:mx-auto lg:max-w-6xl lg:px-8 lg:py-2.5">
        {info}
        {np && (
          <IconButton
            label={t('player.skipBack', { count: skipBackSeconds })}
            className="hidden sm:inline-flex"
            onClick={() => void skip(-skipBackSeconds)}
          >
            <RotateCcw />
          </IconButton>
        )}
        {(np || head) && (
          <button
            type="button"
            aria-label={np && !np.paused ? t('player.pause') : t('player.play')}
            onClick={() => void togglePlay()}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-fg text-bg transition-transform active:scale-90"
          >
            {np && !np.paused ? (
              <Pause className="size-5 fill-current" />
            ) : (
              <Play className="ml-0.5 size-5 fill-current" />
            )}
          </button>
        )}
        {np && (
          <IconButton
            label={t('player.skipForward', { count: skipForwardSeconds })}
            onClick={() => void skip(skipForwardSeconds)}
          >
            <RotateCw />
          </IconButton>
        )}
        <DevicePicker />
      </div>
    </div>
  );
}

export default MiniPlayer;
