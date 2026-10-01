import {
  ChevronDown,
  ExternalLink,
  ListMusic,
  MonitorSpeaker,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipForward,
  Video,
} from 'lucide-react';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import IconButton from '../../app/ui/icon-button';
import Sheet from '../../app/ui/sheet';
import { useDominantColor } from '../../lib/color/dominant';
import { formatClock, isVideoShow } from '../../lib/episodes';
import { useSettings } from '../../lib/storage/settings';
import { useShow } from '../library/queries';
import { useQueueStore } from '../queue/queue-store';
import DeviceList from './device-list';
import {
  next,
  seekTo,
  skip,
  switchToSpotify,
  togglePlay,
} from './player-controller';
import { usePlayer } from './player-store';
import { usePlaybackPosition } from './use-position';

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-xs font-medium text-fg-muted hover:bg-white/5 hover:text-fg [&>svg]:size-5"
    >
      {icon}
      <span className="line-clamp-2 text-center leading-tight">{label}</span>
    </button>
  );
}

function ShowVideoFlag({
  showId,
  children,
}: {
  showId: string;
  children: (video: boolean) => ReactNode;
}) {
  const show = useShow(showId);
  return children(isVideoShow(show.data));
}

export function FullPlayer() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    nowPlaying: np,
    fullPlayerOpen,
    setFullPlayerOpen,
    setVideo,
  } = usePlayer();
  const { skipBackSeconds, skipForwardSeconds } = useSettings();
  const playlistId = useQueueStore((s) => s.playlistId);
  const position = usePlaybackPosition();
  const accent = useDominantColor(np?.image);
  const [scrub, setScrub] = useState<number | null>(null);
  const [devicesOpen, setDevicesOpen] = useState(false);

  const close = () => {
    setDevicesOpen(false);
    setFullPlayerOpen(false);
  };
  const shown = scrub ?? position;
  const commitScrub = () => {
    if (scrub !== null) void seekTo(scrub);
    setScrub(null);
  };

  const videoButton = (video: boolean) =>
    (video || np?.video) && np ? (
      <ActionButton
        icon={<Video />}
        label={t('episode.watchVideo')}
        onClick={() => {
          close();
          setVideo({
            uri: np.uri,
            name: np.name,
            startAt: Math.floor(position / 1000),
          });
        }}
      />
    ) : null;

  return (
    <Sheet
      open={fullPlayerOpen && !!np}
      onClose={close}
      label={t('player.open')}
      variant="full"
    >
      {np && (
        <div
          style={accent ? ({ '--accent': accent } as CSSProperties) : undefined}
          className="flex min-h-full flex-col bg-gradient-to-b from-accent/60 via-accent/15 to-bg"
        >
          <div className="pt-safe mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-8 lg:max-w-lg">
            <div className="flex items-center justify-between py-2">
              <IconButton label={t('player.close')} onClick={close}>
                <ChevronDown />
              </IconButton>
              <button
                type="button"
                onClick={() => setDevicesOpen((o) => !o)}
                className="flex min-w-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-fg-muted hover:bg-white/10"
              >
                <MonitorSpeaker className="size-4 shrink-0" aria-hidden />
                <span className="truncate">
                  {np.isLocal ? t('player.thisDevice') : np.deviceName}
                </span>
              </button>
              <span className="size-10" />
            </div>

            <div className="my-6 flex flex-1 items-center justify-center">
              {np.image ? (
                <img
                  src={np.image}
                  alt=""
                  className="aspect-square w-full max-w-sm rounded-3xl object-cover shadow-2xl"
                />
              ) : (
                <div className="aspect-square w-full max-w-sm rounded-3xl bg-surface-2" />
              )}
            </div>

            <div className="mb-5">
              <h2 className="text-xl leading-snug font-bold text-balance">
                {np.name}
              </h2>
              {np.showId ? (
                <Link
                  to={`/podcast/${np.showId}`}
                  onClick={close}
                  className="mt-1 inline-block font-medium text-accent hover:underline"
                >
                  {np.showName}
                </Link>
              ) : (
                <p className="mt-1 text-fg-muted">{np.showName}</p>
              )}
            </div>

            <input
              type="range"
              aria-label={t('player.seek')}
              min={0}
              max={np.durationMs}
              step={1000}
              value={Math.min(shown, np.durationMs)}
              onChange={(e) => setScrub(Number(e.target.value))}
              onPointerUp={commitScrub}
              onKeyUp={commitScrub}
              onBlur={commitScrub}
              className="w-full accent-[var(--accent)]"
            />
            <div className="mt-1 flex justify-between text-xs text-fg-muted tabular-nums">
              <span>{formatClock(shown)}</span>
              <span>-{formatClock(np.durationMs - shown)}</span>
            </div>

            {/* Skip/play/skip stay centered; "next" sits on the right. */}
            <div className="my-6 grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-4">
              <span />
              <IconButton
                size="lg"
                label={t('player.skipBack', { count: skipBackSeconds })}
                onClick={() => void skip(-skipBackSeconds)}
                className="text-fg"
              >
                <RotateCcw />
              </IconButton>
              <button
                type="button"
                aria-label={np.paused ? t('player.play') : t('player.pause')}
                onClick={() => void togglePlay()}
                className="inline-flex size-18 items-center justify-center rounded-full bg-fg text-bg shadow-xl transition-transform active:scale-90"
              >
                {np.paused ? (
                  <Play className="ml-1 size-8 fill-current" />
                ) : (
                  <Pause className="size-8 fill-current" />
                )}
              </button>
              <IconButton
                size="lg"
                label={t('player.skipForward', { count: skipForwardSeconds })}
                onClick={() => void skip(skipForwardSeconds)}
                className="text-fg"
              >
                <RotateCw />
              </IconButton>
              <IconButton
                size="lg"
                label={t('player.next')}
                onClick={() => void next()}
                className="justify-self-end text-fg"
              >
                <SkipForward />
              </IconButton>
            </div>

            <div className="flex items-start justify-between gap-1 border-t border-white/10 pt-3">
              <ActionButton
                icon={<MonitorSpeaker />}
                label={t('player.devices')}
                onClick={() => setDevicesOpen((o) => !o)}
              />
              {np.showId ? (
                <ShowVideoFlag showId={np.showId}>{videoButton}</ShowVideoFlag>
              ) : (
                videoButton(false)
              )}
              <ActionButton
                icon={<ListMusic />}
                label={t('player.upNext')}
                onClick={() => {
                  close();
                  navigate('/queue');
                }}
              />
              {playlistId && (
                <ActionButton
                  icon={<ExternalLink />}
                  label={t('player.switchToSpotify')}
                  onClick={() => void switchToSpotify(playlistId)}
                />
              )}
            </div>
            {devicesOpen && (
              <div className="mt-3 rounded-2xl bg-surface/80 p-2 backdrop-blur">
                <DeviceList onPicked={() => setDevicesOpen(false)} />
              </div>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}

export default FullPlayer;
