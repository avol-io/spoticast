import { Check, Plus, Video } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { isVideoShow, pickImage } from '../../lib/episodes';
import type { SimplifiedShow } from '../../lib/spotify/types';
import { useFollowShow, useIsFollowing } from '../library/queries';

export interface ShowResultRowProps {
  /** Rank in a chart, shown on the left. */
  rank?: number;
  show: Pick<SimplifiedShow, 'id' | 'name' | 'images'> &
    Partial<SimplifiedShow>;
  subtitle?: string;
  /** Chart movement indicator. */
  badge?: React.ReactNode;
  onOpen?: () => void;
}

/** A podcast in search results or charts, with a follow toggle. */
export function ShowResultRow({
  rank,
  show,
  subtitle,
  badge,
  onOpen,
}: ShowResultRowProps) {
  const { t } = useTranslation();
  const following = useIsFollowing(show.id);
  const follow = useFollowShow();
  const followable = !!show.uri;

  return (
    <div className="flex items-center gap-3 py-2">
      {rank !== undefined && (
        <span className="w-7 shrink-0 text-center text-sm font-bold text-fg-muted tabular-nums">
          {rank}
        </span>
      )}
      <Link
        to={`/podcast/${show.id}`}
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <img
          src={pickImage(show.images, 64)}
          alt=""
          loading="lazy"
          className="size-14 shrink-0 rounded-lg bg-surface-2 object-cover"
        />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-semibold">{show.name}</span>
            {show.media_type && isVideoShow(show as SimplifiedShow) && (
              <Video
                className="size-3.5 shrink-0 text-fg-subtle"
                aria-label={t('podcast.video')}
              />
            )}
          </span>
          {subtitle && (
            <span className="block truncate text-sm text-fg-muted">
              {subtitle}
            </span>
          )}
        </span>
      </Link>
      {badge}
      {followable && following !== undefined && (
        <button
          type="button"
          aria-pressed={following}
          aria-label={`${following ? t('podcast.following') : t('podcast.follow')}: ${show.name}`}
          disabled={follow.isPending}
          onClick={() =>
            follow.mutate({ show: show as SimplifiedShow, follow: !following })
          }
          className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors ${
            following
              ? 'bg-surface-3 text-success'
              : 'bg-surface-2 text-fg-muted hover:text-fg'
          }`}
        >
          {following ? (
            <Check className="size-4" />
          ) : (
            <Plus className="size-4" />
          )}
        </button>
      )}
    </div>
  );
}

export default ShowResultRow;
