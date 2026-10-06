import {
  ArrowLeft,
  Check,
  ExternalLink,
  Plus,
  Share2,
  Video,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import IconButton from '../../app/ui/icon-button';
import { isVideoShow } from '../../lib/episodes';
import type { SimplifiedShow } from '../../lib/spotify/types';
import { toast } from '../../lib/storage/toasts';
import ShowCover from '../home/show-cover';
import { useFollowShow, useIsFollowing } from '../library/queries';

export interface PodcastHeroProps {
  show: SimplifiedShow;
}

/** Shares a Spotify link with the Web Share API, or copies it. */
export async function shareLink(
  title: string,
  url: string,
  copiedMessage: string,
) {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
    } catch {
      // The user dismissed the share sheet.
    }
    return;
  }
  await navigator.clipboard?.writeText(url);
  toast(copiedMessage);
}

export function PodcastHero({ show }: PodcastHeroProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const following = useIsFollowing(show.id);
  const follow = useFollowShow();
  const [expanded, setExpanded] = useState(false);

  const goBack = () => {
    // Pop when we came from inside the app so the home keeps its scroll
    // position (React Router replays the view transition on POP).
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate('/', { viewTransition: true });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="-ml-2">
        <IconButton label={t('podcast.back')} onClick={goBack}>
          <ArrowLeft />
        </IconButton>
      </div>
      <div className="flex items-end gap-4 lg:flex-col lg:items-start">
        <ShowCover
          show={show}
          size={640}
          transitionName={`cover-${show.id}`}
          className="w-36 shrink-0 sm:w-44 lg:w-full"
        />
        <div className="min-w-0 flex-1">
          {isVideoShow(show) && (
            <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-xs font-semibold text-accent-ink">
              <Video className="size-3.5" aria-hidden />
              {t('podcast.video')}
            </span>
          )}
          <h1 className="text-2xl leading-tight font-extrabold tracking-tight text-balance lg:text-3xl">
            {show.name}
          </h1>
          {show.total_episodes > 0 && (
            <p className="mt-1 text-sm text-fg-muted">
              {t('podcast.episodes', { count: show.total_episodes })}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {following !== undefined && (
          <button
            type="button"
            aria-pressed={following}
            disabled={follow.isPending}
            onClick={() => follow.mutate({ show, follow: !following })}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              following ? 'bg-surface-3 text-fg' : 'bg-fg text-bg'
            }`}
          >
            {following ? (
              <Check className="size-4" aria-hidden />
            ) : (
              <Plus className="size-4" aria-hidden />
            )}
            {following ? t('podcast.following') : t('podcast.follow')}
          </button>
        )}
        <IconButton
          label={t('podcast.share')}
          onClick={() =>
            void shareLink(
              show.name,
              show.external_urls.spotify,
              t('podcast.linkCopied'),
            )
          }
        >
          <Share2 />
        </IconButton>
        <a
          href={show.external_urls.spotify}
          target="_blank"
          rel="noreferrer"
          aria-label={t('podcast.openInSpotify')}
          title={`${t('podcast.openInSpotify')} — ${t('podcast.ratingsHint')}`}
          className="inline-flex size-10 items-center justify-center rounded-full text-fg-muted hover:bg-surface-2 hover:text-fg"
        >
          <ExternalLink className="size-5" />
        </a>
      </div>

      {show.description && (
        <div className="text-sm text-fg-muted">
          <p className={expanded ? 'whitespace-pre-line' : 'line-clamp-3'}>
            {show.description}
          </p>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="mt-1 font-semibold text-fg"
          >
            {expanded ? t('podcast.showLess') : t('podcast.showMore')}
          </button>
        </div>
      )}
    </div>
  );
}

export default PodcastHero;
