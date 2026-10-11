import { MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SpotifyIcon from '../../app/ui/spotify-icon';

export interface SpotifyCommentsProps {
  episodeId: string;
}

/** Comments live only in Spotify: explains it and links there. */
export function SpotifyComments({ episodeId }: SpotifyCommentsProps) {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-surface-2/60 p-4">
      <h3 className="flex items-center gap-2 font-semibold">
        <MessageCircle className="size-4" aria-hidden />
        {t('episode.comments')}
      </h3>
      <p className="text-sm text-fg-muted">
        {t('episode.commentsText')}{' '}
        <span className="text-fg">{t('episode.commentsBack')}</span>
      </p>
      <a
        href={`https://open.spotify.com/episode/${episodeId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 self-start rounded-full bg-fg px-4 py-2 text-sm font-semibold text-bg"
      >
        <SpotifyIcon className="size-4" />
        {t('episode.commentsOpen')}
      </a>
    </section>
  );
}

export default SpotifyComments;
