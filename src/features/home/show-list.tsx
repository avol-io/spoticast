import { useTranslation } from 'react-i18next';
import { formatReleaseDate, releaseDate } from '../../lib/episodes';
import type {
  SimplifiedEpisode,
  SimplifiedShow,
} from '../../lib/spotify/types';
import type { Badge } from '../library/queries';
import ShowCover from './show-cover';

export interface ShowListRowProps {
  show: SimplifiedShow;
  badge?: Badge;
  latest?: SimplifiedEpisode;
  transitionName?: string;
}

/** Content of a show in the list layout (the link wrapper is in ShowCollection). */
export function ShowListRow({
  show,
  badge,
  latest,
  transitionName,
}: ShowListRowProps) {
  const { t, i18n } = useTranslation();
  return (
    <div className="flex items-center gap-4 py-2.5">
      <ShowCover
        show={show}
        transitionName={transitionName}
        size={64}
        className="w-16 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{show.name}</p>
        {latest && (
          <p className="truncate text-sm text-fg-muted">
            {formatReleaseDate(releaseDate(latest), i18n.language)} ·{' '}
            {latest.name}
          </p>
        )}
        {badge && badge.count > 0 && (
          <p className="text-xs font-medium text-brand">
            {t('home.unplayed', { count: badge.count })}
            {badge.more && '+'}
          </p>
        )}
      </div>
    </div>
  );
}

export default ShowListRow;
