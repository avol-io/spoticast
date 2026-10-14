import { Bug } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatReleaseDate, releaseDate } from '../../lib/episodes';
import type { SimplifiedEpisode } from '../../lib/spotify/types';
import { useSettings } from '../../lib/storage/settings';

export interface ReleaseDateProps {
  episode: Pick<SimplifiedEpisode, 'release_date' | 'release_date_precision'>;
}

/** Release date as shown in lists; debug mode adds what Spotify sent. */
export function ReleaseDate({ episode }: ReleaseDateProps) {
  const { i18n } = useTranslation();
  const debugMode = useSettings((s) => s.debugMode);
  const formatted = formatReleaseDate(releaseDate(episode), i18n.language);
  if (!debugMode) return formatted;
  const precision =
    episode.release_date_precision && episode.release_date_precision !== 'day'
      ? ` (${episode.release_date_precision})`
      : '';
  return (
    <>
      {formatted}{' '}
      <span className="inline-flex items-center gap-0.5 font-mono text-fg-subtle">
        <Bug className="size-3 shrink-0" aria-hidden />
        {episode.release_date}
        {precision} → {formatted}
      </span>
    </>
  );
}

export default ReleaseDate;
