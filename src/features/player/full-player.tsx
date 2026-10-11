import { useQuery } from '@tanstack/react-query';
import {
  ChevronDown,
  ListMusic,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipForward,
  Video,
} from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import IconButton from '../../app/ui/icon-button';
import Sheet from '../../app/ui/sheet';
import SpotifyIcon from '../../app/ui/spotify-icon';
import { useDominantColor } from '../../lib/color/dominant';
import {
  formatClock,
  formatDuration,
  formatReleaseDate,
  isVideoShow,
  pickImage,
  releaseDate,
} from '../../lib/episodes';
import { getEpisode } from '../../lib/spotify/endpoints';
import type { Episode } from '../../lib/spotify/types';
import { useSettings } from '../../lib/storage/settings';
import { withViewTransition } from '../../lib/view-transition';
import EpisodeDetails from '../episode/episode-details';
import { episodeKey } from '../episode/open-episode';
import SpotifyComments from '../episode/spotify-comments';
import { useShow } from '../library/queries';
import { useQueue } from '../queue/queue';
import { useQueueStore } from '../queue/queue-store';
import DevicePicker from './device-picker';
import { closeFullPlayer, COVER_TRANSITION } from './full-player-open';
import type { NowPlaying } from './playback';
import {
  next,
  playEpisode,
  seekTo,
  skip,
  switchToSpotify,
  togglePlay,
} from './player-controller';
import { usePlayer } from './player-store';
import { usePlaybackPosition } from './use-position';

type Tab = 'episode' | 'notes' | 'comments';

/** Movement that tells a drag from a tap. */
const SLOP = 8;

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

/**
 * Swipe down to close: the panel follows the finger and leaves past a
 * quarter of the screen (or on a quick flick), else it snaps back.
 */
function useSwipeDown() {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<{ y: number; t: number; active: boolean } | null>(
    null,
  );
  // The click that ends a drag must not reach a tab or a button.
  const dragged = useRef(false);

  const begin = (y: number) => {
    gesture.current = { y, t: performance.now(), active: false };
    dragged.current = false;
  };
  /** Returns true while the gesture is a drag. */
  const move = (y: number) => {
    const g = gesture.current;
    if (!g) return false;
    const dy = y - g.y;
    if (!g.active) {
      if (dy < SLOP) {
        if (dy < -SLOP) gesture.current = null;
        return false;
      }
      g.active = true;
      dragged.current = true;
      setDragging(true);
    }
    setOffset(Math.max(0, dy));
    return true;
  };
  const end = (y: number | null) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g?.active) return;
    setDragging(false);
    const dy = y === null ? 0 : y - g.y;
    const speed = dy / Math.max(1, performance.now() - g.t);
    if (dy > window.innerHeight / 4 || (dy > 48 && speed > 0.6)) {
      setOffset(window.innerHeight);
      setTimeout(() => usePlayer.getState().setFullPlayerOpen(false), 200);
    } else setOffset(0);
    if (dragged.current)
      setTimeout(() => {
        dragged.current = false;
      }, 0);
  };

  /** Handlers for areas that never scroll (header, cover). */
  const zone = {
    style: { touchAction: 'none' } as CSSProperties,
    onPointerDown: (e: ReactPointerEvent) => {
      if (e.button !== 0) return;
      if ((e.target as Element).closest('input, [popover]')) return;
      begin(e.clientY);
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      const node = e.currentTarget;
      if (move(e.clientY) && !node.hasPointerCapture?.(e.pointerId))
        node.setPointerCapture?.(e.pointerId);
    },
    onPointerUp: (e: ReactPointerEvent) => end(e.clientY),
    onPointerCancel: () => end(null),
    onClickCapture: (e: ReactMouseEvent) => {
      if (dragged.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
  };

  /** A scrolling pane drags the panel only when pulled down from its top. */
  const scrollRef = useRef<HTMLDivElement>(null);
  const handlers = useRef({ begin, move, end });
  handlers.current = { begin, move, end };
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const onStart = (e: TouchEvent) => {
      if (node.scrollTop <= 0) handlers.current.begin(e.touches[0].clientY);
    };
    const onMove = (e: TouchEvent) => {
      if (handlers.current.move(e.touches[0].clientY) && e.cancelable)
        e.preventDefault();
    };
    const onEnd = (e: TouchEvent) =>
      handlers.current.end(e.changedTouches[0]?.clientY ?? null);
    node.addEventListener('touchstart', onStart, { passive: true });
    node.addEventListener('touchmove', onMove, { passive: false });
    node.addEventListener('touchend', onEnd);
    node.addEventListener('touchcancel', onEnd);
    return () => {
      node.removeEventListener('touchstart', onStart);
      node.removeEventListener('touchmove', onMove);
      node.removeEventListener('touchend', onEnd);
      node.removeEventListener('touchcancel', onEnd);
    };
  });

  const style: CSSProperties = {
    transform: offset ? `translateY(${offset}px)` : undefined,
    transition: dragging ? 'none' : 'transform 200ms ease-out',
  };
  return { style, zone, scrollRef };
}

function Cover({ np, small }: { np: NowPlaying; small?: boolean }) {
  const style = { viewTransitionName: COVER_TRANSITION };
  const size = small
    ? 'size-14 rounded-xl shadow-lg'
    : 'aspect-square max-h-full w-full max-w-sm rounded-3xl shadow-2xl';
  return np.image ? (
    <img
      src={np.image}
      alt=""
      style={style}
      className={`${size} object-cover`}
    />
  ) : (
    <div style={style} className={`${size} bg-surface-2`} />
  );
}

function Titles({
  np,
  onNavigate,
}: {
  np: NowPlaying;
  onNavigate: () => void;
}) {
  return (
    <div className="min-w-0">
      <h2 className="text-xl leading-snug font-bold text-balance">{np.name}</h2>
      {np.showId ? (
        <Link
          to={`/podcast/${np.showId}`}
          onClick={onNavigate}
          className="mt-1 inline-block font-medium text-accent-ink hover:underline"
        >
          {np.showName}
        </Link>
      ) : (
        <p className="mt-1 text-fg-muted">{np.showName}</p>
      )}
    </div>
  );
}

function Notes({ np }: { np: NowPlaying }) {
  const { i18n } = useTranslation();
  const episode = useQuery({
    queryKey: episodeKey(np.id),
    queryFn: ({ signal }) => getEpisode(np.id, signal),
    staleTime: 5 * 60_000,
  });
  if (!episode.data)
    return (
      <div className="flex animate-pulse flex-col gap-2" aria-busy>
        <div className="h-3 w-1/3 rounded bg-surface-2" />
        <div className="h-3 w-full rounded bg-surface-2" />
        <div className="h-3 w-5/6 rounded bg-surface-2" />
      </div>
    );
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium text-fg-subtle">
        {formatReleaseDate(releaseDate(episode.data), i18n.language)} ·{' '}
        {formatDuration(episode.data.duration_ms, i18n.language)}
      </p>
      <EpisodeDetails episode={episode.data} />
    </div>
  );
}

/**
 * The head of Up Next shown before anything is loaded, as a paused
 * NowPlaying: it starts on the playback device when played.
 */
function cuedNowPlaying(episode: Episode): NowPlaying {
  const resume = episode.resume_point;
  return {
    uri: episode.uri,
    id: episode.id,
    type: 'episode',
    name: episode.name,
    showName: episode.show.name,
    showId: episode.show.id,
    image: pickImage(
      episode.images?.length ? episode.images : episode.show.images,
    ),
    durationMs: episode.duration_ms,
    positionMs: resume && !resume.fully_played ? resume.resume_position_ms : 0,
    updatedAt: Date.now(),
    paused: true,
    contextUri: null,
    deviceId: null,
    deviceName: '',
    isLocal: false,
    video: false,
  };
}

function PlayerSheet({
  np,
  cued,
}: {
  np: NowPlaying;
  /** Nothing is loaded yet: this head of Up Next plays from `np`. */
  cued?: Episode;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setFullPlayerOpen = usePlayer((s) => s.setFullPlayerOpen);
  const setVideo = usePlayer((s) => s.setVideo);
  const { skipBackSeconds, skipForwardSeconds } = useSettings();
  const playlistId = useQueueStore((s) => s.playlistId);
  const playing = usePlaybackPosition();
  // Before playback, seeking and skipping move where it will start.
  const [cuedAt, setCuedAt] = useState(np.positionMs);
  const [cuedUri, setCuedUri] = useState(cued?.uri);
  if (cued && cued.uri !== cuedUri) {
    // Up Next changed under us: start from the new head's position.
    setCuedUri(cued.uri);
    setCuedAt(np.positionMs);
  }
  const position = cued ? cuedAt : playing;
  const clamp = (ms: number) => Math.max(0, Math.min(np.durationMs - 1000, ms));
  const seek = (ms: number) => (cued ? setCuedAt(clamp(ms)) : void seekTo(ms));
  const skipBy = (seconds: number) =>
    cued ? setCuedAt(clamp(cuedAt + seconds * 1000)) : void skip(seconds);
  const accent = useDominantColor(np.image);
  const [scrub, setScrub] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>('episode');
  const swipe = useSwipeDown();

  // Leaving for another page: no transition, the page changes anyway.
  const leave = () => setFullPlayerOpen(false);
  const shown = scrub ?? position;
  const commitScrub = () => {
    if (scrub !== null) seek(scrub);
    setScrub(null);
  };
  const isEpisode = np.type === 'episode';
  const tabs: [Tab, string][] = [
    ['episode', t('player.tabEpisode')],
    ['notes', t('episode.notes')],
    ['comments', t('episode.comments')],
  ];

  const videoButton = (video: boolean) =>
    video || np.video ? (
      <ActionButton
        icon={<Video />}
        label={t('episode.watchVideo')}
        onClick={() => {
          leave();
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
      open
      onClose={closeFullPlayer}
      label={t('player.open')}
      variant="full"
      className="player-in"
      style={{ viewTransitionName: 'full-player', ...swipe.style }}
    >
      <div
        style={accent ? ({ '--accent': accent } as CSSProperties) : undefined}
        className="flex h-full flex-col bg-gradient-to-b from-accent/60 via-accent/15 to-bg"
      >
        <div className="pt-safe mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:max-w-lg">
          <div {...swipe.zone} className="shrink-0">
            {/* Grab handle: the panel can be swiped down. */}
            <div
              aria-hidden
              className="mx-auto mt-2 h-1 w-10 rounded-full bg-fg/30 lg:hidden"
            />
            <div className="flex items-center justify-between py-2">
              <IconButton label={t('player.close')} onClick={closeFullPlayer}>
                <ChevronDown />
              </IconButton>
            </div>
            {isEpisode && (
              <div
                role="tablist"
                className="mx-auto mb-2 flex w-fit gap-1 rounded-full bg-black/15 p-1"
              >
                {tabs.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={tab === value}
                    onClick={() => withViewTransition(() => setTab(value))}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      tab === value
                        ? 'bg-fg text-bg'
                        : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {tab === 'episode' || !isEpisode ? (
            <div
              {...swipe.zone}
              className="flex min-h-0 flex-1 flex-col justify-end gap-5 pt-4"
            >
              <div className="flex min-h-0 flex-1 items-center justify-center">
                <Cover np={np} />
              </div>
              <Titles np={np} onNavigate={leave} />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-4 pt-2">
              <div className="flex shrink-0 items-center gap-3">
                <Cover np={np} small />
                <Titles np={np} onNavigate={leave} />
              </div>
              <div
                ref={swipe.scrollRef}
                role="tabpanel"
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
              >
                {tab === 'notes' ? (
                  <Notes np={np} />
                ) : (
                  <SpotifyComments episodeId={np.id} />
                )}
              </div>
            </div>
          )}

          <div className="shrink-0 pt-5">
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
            <div className="my-5 grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-4">
              <span />
              <IconButton
                size="lg"
                label={t('player.skipBack', { count: skipBackSeconds })}
                onClick={() => skipBy(-skipBackSeconds)}
                className="text-fg"
              >
                <RotateCcw />
              </IconButton>
              <button
                type="button"
                aria-label={np.paused ? t('player.play') : t('player.pause')}
                onClick={() =>
                  void (cued
                    ? playEpisode(cued, { positionMs: cuedAt })
                    : togglePlay())
                }
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
                onClick={() => skipBy(skipForwardSeconds)}
                className="text-fg"
              >
                <RotateCw />
              </IconButton>
              <IconButton
                size="lg"
                label={t('player.next')}
                disabled={!!cued}
                onClick={() => void next()}
                className="justify-self-end text-fg"
              >
                <SkipForward />
              </IconButton>
            </div>

            <div className="flex items-start justify-between gap-1 border-t border-white/10 pt-3">
              <DevicePicker variant="action" />
              {np.showId ? (
                <ShowVideoFlag showId={np.showId}>{videoButton}</ShowVideoFlag>
              ) : (
                videoButton(false)
              )}
              <ActionButton
                icon={<ListMusic />}
                label={t('player.upNext')}
                onClick={() => {
                  leave();
                  navigate('/queue');
                }}
              />
              {playlistId && (
                <ActionButton
                  icon={<SpotifyIcon />}
                  label={t('player.switchToSpotify')}
                  onClick={() => void switchToSpotify(playlistId)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </Sheet>
  );
}

/**
 * What plays (else the head of Up Next, ready to play), with tabs for the
 * episode notes and comments over controls that always stay in view. It opens out of the mini player and closes with
 * the chevron, Escape or a swipe down.
 */
export function FullPlayer() {
  const open = usePlayer((s) => s.fullPlayerOpen);
  const np = usePlayer((s) => s.nowPlaying);
  const head = useQueue().data?.episodes[0];
  if (!open) return null;
  if (np) return <PlayerSheet np={np} />;
  // Nothing loaded: the head of Up Next, ready to play.
  return head ? <PlayerSheet np={cuedNowPlaying(head)} cued={head} /> : null;
}

export default FullPlayer;
