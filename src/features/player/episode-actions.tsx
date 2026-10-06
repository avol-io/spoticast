import {
  Archive,
  ArchiveRestore,
  Bookmark,
  BookmarkMinus,
  ExternalLink,
  ListEnd,
  ListMinus,
  ListStart,
  MoreVertical,
  Pause,
  Play,
  Share2,
  Video,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Menu, { type MenuItem } from '../../app/ui/menu';
import type { Episode } from '../../lib/spotify/types';
import {
  archiveEpisode,
  restoreEpisode,
  useIsArchived,
} from '../archive/use-archive';
import {
  useIsSavedEpisode,
  useToggleSavedEpisode,
} from '../library/your-episodes';
import { shareLink } from '../podcast/podcast-hero';
import { addToQueue, removeFromQueue, useIsInQueue } from '../queue/queue';
import { playEpisode, togglePlay } from './player-controller';
import { usePlayer } from './player-store';

export interface PlayButtonProps {
  episode: Episode;
  size?: 'md' | 'lg';
}

export function PlayButton({ episode, size = 'md' }: PlayButtonProps) {
  const { t } = useTranslation();
  const np = usePlayer((s) => s.nowPlaying);
  const current = np?.uri === episode.uri;
  const playing = current && !np?.paused;
  return (
    <button
      type="button"
      aria-label={`${playing ? t('episode.pause') : t('episode.play')}: ${episode.name}`}
      onClick={() => void (current ? togglePlay() : playEpisode(episode))}
      className={`inline-flex shrink-0 items-center justify-center rounded-full transition-transform active:scale-90 ${
        current
          ? 'bg-fg text-bg ring-2 ring-accent ring-offset-2 ring-offset-bg'
          : 'bg-surface-3 text-fg hover:bg-fg hover:text-bg'
      } ${size === 'lg' ? 'size-12' : 'size-10'}`}
    >
      {playing ? (
        <Pause className="size-4 fill-current" aria-hidden />
      ) : (
        <Play className="ml-0.5 size-4 fill-current" aria-hidden />
      )}
    </button>
  );
}

export interface EpisodeActionsProps {
  episode: Episode;
  /** The show publishes video: offer the embedded video player. */
  video?: boolean;
}

/** Play button plus the "more" menu of an episode row. */
export function EpisodeActions({ episode, video }: EpisodeActionsProps) {
  const { t } = useTranslation();
  const nowPlayingUri = usePlayer((s) => s.nowPlaying?.uri);
  const setVideo = usePlayer((s) => s.setVideo);
  const inQueue = useIsInQueue(episode.uri);
  const saved = useIsSavedEpisode(episode.uri);
  const toggleSaved = useToggleSavedEpisode();
  const archived = useIsArchived()(episode);

  const items: MenuItem[] = [
    {
      label: t('episode.playNext'),
      icon: <ListStart />,
      onSelect: () =>
        void addToQueue(episode, 'next', nowPlayingUri).catch(() => undefined),
    },
    {
      label: t('episode.playLast'),
      icon: <ListEnd />,
      onSelect: () =>
        void addToQueue(episode, 'last', nowPlayingUri).catch(() => undefined),
    },
    ...(inQueue
      ? [
          {
            label: t('episode.removeFromQueue'),
            icon: <ListMinus />,
            onSelect: () =>
              void removeFromQueue(episode.uri).catch(() => undefined),
          },
        ]
      : []),
    archived
      ? {
          label: t('archive.restore'),
          icon: <ArchiveRestore />,
          onSelect: () => restoreEpisode(episode),
        }
      : {
          label: t('archive.archive'),
          icon: <Archive />,
          onSelect: () => archiveEpisode(episode),
        },
    {
      label: saved ? t('episode.unsaveEpisode') : t('episode.saveEpisode'),
      icon: saved ? <BookmarkMinus /> : <Bookmark />,
      onSelect: () => toggleSaved.mutate({ episode, save: !saved }),
    },
    ...(video
      ? [
          {
            label: t('episode.watchVideo'),
            icon: <Video />,
            onSelect: () =>
              setVideo({
                uri: episode.uri,
                name: episode.name,
                startAt: Math.floor(
                  (episode.resume_point?.resume_position_ms ?? 0) / 1000,
                ),
              }),
          },
        ]
      : []),
    {
      label: t('podcast.share'),
      icon: <Share2 />,
      onSelect: () =>
        void shareLink(
          episode.name,
          episode.external_urls.spotify,
          t('podcast.linkCopied'),
        ),
    },
    {
      label: t('podcast.openInSpotify'),
      icon: <ExternalLink />,
      onSelect: () =>
        window.open(episode.external_urls.spotify, '_blank', 'noopener'),
    },
  ];

  return (
    <>
      <Menu label={t('episode.more')} icon={<MoreVertical />} items={items} />
      <PlayButton episode={episode} />
    </>
  );
}

export default EpisodeActions;
