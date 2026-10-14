import { Archive, Check, Undo2, Video } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { episodeProgress, formatDuration, pickImage } from '../../lib/episodes';
import type { SimplifiedEpisode } from '../../lib/spotify/types';
import { useArchiveStatus } from '../archive/use-archive';
import {
  CARD_TRANSITION,
  EPISODE_PARAM,
  useEpisodeCard,
  useOpenEpisode,
} from '../episode/open-episode';
import ReleaseDate from '../episode/release-date';

export interface EpisodeRowProps {
  episode: SimplifiedEpisode;
  /** Show the episode artwork (lists mixing several podcasts). */
  showCover?: boolean;
  /** Secondary line above the title, e.g. the podcast name. */
  eyebrow?: string;
  video?: boolean;
  /** Play button, menus… rendered on the right. */
  actions?: ReactNode;
}

/** Duration, progress or archive state of an episode. */
export function EpisodeStatus({
  episode,
  className = '',
}: {
  episode: SimplifiedEpisode;
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const status = useArchiveStatus(episode);
  const played = status === 'played';
  const progress = episodeProgress(episode);
  const inProgress =
    progress.started && !status && !episode.resume_point?.fully_played;

  return (
    <div
      className={`flex items-center gap-2 text-xs text-fg-muted ${className}`}
    >
      {status === 'pending' ? (
        <span
          className="flex items-center gap-1 text-fg-muted"
          title={t('archive.pendingHint')}
        >
          <Archive className="size-3.5" aria-hidden />
          {t('archive.archived')}
        </span>
      ) : status === 'restored' ? (
        <span
          className="flex items-center gap-1"
          title={t('archive.restoredHint')}
        >
          <Undo2 className="size-3.5" aria-hidden />
          {t('archive.restored')} ·{' '}
          {formatDuration(episode.duration_ms, i18n.language)}
        </span>
      ) : played ? (
        <span className="flex items-center gap-1 text-success">
          <Check className="size-3.5" aria-hidden />
          {t('episode.played')}
        </span>
      ) : inProgress ? (
        <>
          <span
            className="h-1 w-16 overflow-hidden rounded-full bg-surface-3"
            role="progressbar"
            aria-label={t('episode.remaining', {
              time: formatDuration(progress.remainingMs, i18n.language),
            })}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress.fraction * 100)}
          >
            <span
              className="block h-full bg-accent"
              style={{ width: `${progress.fraction * 100}%` }}
            />
          </span>
          <span>
            {t('episode.remaining', {
              time: formatDuration(progress.remainingMs, i18n.language),
            })}
          </span>
        </>
      ) : (
        <span>{formatDuration(episode.duration_ms, i18n.language)}</span>
      )}
    </div>
  );
}

export function EpisodeRow({
  episode,
  showCover,
  eyebrow,
  video,
  actions,
}: EpisodeRowProps) {
  const { t } = useTranslation();
  const status = useArchiveStatus(episode);
  const openEpisode = useOpenEpisode();
  const [params] = useSearchParams();
  const lastOpened = useEpisodeCard((s) => s.lastOpened === episode.id);
  // Named only while the card is closed: two elements can't share a name.
  const named = lastOpened && !params.has(EPISODE_PARAM);

  return (
    <article
      className="flex gap-3 py-3"
      style={named ? { viewTransitionName: CARD_TRANSITION } : undefined}
    >
      {showCover && (
        <img
          src={pickImage(episode.images, 64)}
          alt=""
          loading="lazy"
          className="size-14 shrink-0 rounded-lg bg-surface-2 object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => openEpisode(episode)}
          className="block w-full text-left"
        >
          <p className="flex flex-wrap items-center gap-x-1.5 text-xs font-medium text-fg-subtle">
            {eyebrow && (
              <span className="truncate text-accent-ink">{eyebrow} ·</span>
            )}
            <span>
              <ReleaseDate episode={episode} />
            </span>
            {video && (
              <Video className="size-3.5" aria-label={t('podcast.video')} />
            )}
            {episode.explicit && (
              <span
                title={t('episode.explicit')}
                className="rounded bg-surface-3 px-1 text-[10px] leading-4 font-bold"
              >
                E
              </span>
            )}
          </p>
          <h2
            className={`mt-0.5 line-clamp-2 font-semibold ${status === 'played' || status === 'pending' ? 'text-fg-muted' : ''}`}
          >
            {episode.name}
          </h2>
        </button>
        <EpisodeStatus episode={episode} className="mt-1.5" />
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-1 self-center">
          {actions}
        </div>
      )}
    </article>
  );
}

export default EpisodeRow;
