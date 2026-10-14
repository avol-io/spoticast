import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import EmptyState from '../../app/ui/empty-state';
import IconButton from '../../app/ui/icon-button';
import Sheet from '../../app/ui/sheet';
import { useDominantColor } from '../../lib/color/dominant';
import { isVideoShow, pickImage } from '../../lib/episodes';
import { getEpisode } from '../../lib/spotify/endpoints';
import { useErrorText } from '../../lib/spotify/errors';
import type { Episode } from '../../lib/spotify/types';
import { PlayButton, useEpisodeMenuItems } from '../player/episode-actions';
import { EpisodeStatus } from '../podcast/episode-row';
import EpisodeDetails from './episode-details';
import {
  CARD_TRANSITION,
  EPISODE_PARAM,
  episodeKey,
  useCloseEpisode,
} from './open-episode';
import SpotifyComments from './spotify-comments';
import ReleaseDate from './release-date';

/** The actions of the row menu, as labelled buttons. */
function CardActions({ episode }: { episode: Episode }) {
  const items = useEpisodeMenuItems({
    episode,
    video: isVideoShow(episode.show),
  });
  return (
    <div className="grid grid-cols-4 gap-1">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={item.onSelect}
          className="flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] leading-tight font-medium text-fg-muted hover:bg-surface-2 hover:text-fg [&>svg]:size-5"
        >
          {item.icon}
          <span className="line-clamp-2 text-center">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

function CardContent({ episode }: { episode: Episode }) {
  const { t } = useTranslation();
  const show = episode.show as Episode['show'] | undefined;
  const image = pickImage(
    episode.images?.length ? episode.images : show?.images,
    300,
  );
  const accent = useDominantColor(image);

  return (
    <div
      style={accent ? ({ '--accent': accent } as CSSProperties) : undefined}
      className="flex flex-col gap-5 bg-gradient-to-b from-accent/25 via-transparent to-transparent p-5"
    >
      <div className="flex items-start gap-4 pr-8">
        {image ? (
          <img
            src={image}
            alt=""
            className="size-24 shrink-0 rounded-2xl object-cover shadow-xl sm:size-28"
          />
        ) : (
          <div className="size-24 shrink-0 rounded-2xl bg-surface-2 sm:size-28" />
        )}
        <div className="min-w-0 flex-1">
          {show && (
            <Link
              to={`/podcast/${show.id}`}
              className="text-sm font-semibold text-accent-ink hover:underline"
            >
              {show.name}
            </Link>
          )}
          <h2 className="mt-0.5 text-lg leading-snug font-bold text-balance">
            {episode.name}
          </h2>
          <p className="mt-1 text-xs text-fg-subtle">
            <ReleaseDate episode={episode} />
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <PlayButton episode={episode} size="lg" />
        <EpisodeStatus episode={episode} className="text-sm" />
      </div>

      <CardActions episode={episode} />

      <section className="flex flex-col gap-2">
        <h3 className="font-semibold">{t('episode.notes')}</h3>
        <EpisodeDetails episode={episode} />
      </section>

      <SpotifyComments episodeId={episode.id} />
    </div>
  );
}

/**
 * The episode named by the `episode` search param, in a card over the page.
 * It grows out of the row it was opened from (view transition).
 */
export function EpisodeCard() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const [params] = useSearchParams();
  const id = params.get(EPISODE_PARAM);
  const close = useCloseEpisode();
  const query = useQuery({
    queryKey: episodeKey(id ?? ''),
    queryFn: ({ signal }) => getEpisode(id as string, signal),
    enabled: !!id,
    staleTime: 5 * 60_000,
  });

  return (
    <Sheet
      open={!!id}
      onClose={close}
      label={t('episode.details')}
      variant="card"
      className="card-in"
      style={{ viewTransitionName: CARD_TRANSITION }}
    >
      <div className="sticky top-0 z-10 h-0">
        <IconButton
          label={t('episode.close')}
          onClick={close}
          className="absolute top-3 right-3 bg-surface/80 backdrop-blur-md"
        >
          <X />
        </IconButton>
      </div>
      {query.data ? (
        <CardContent episode={query.data} />
      ) : query.isError ? (
        <EmptyState
          title={t('errors.loadFailed')}
          description={errorText(query.error)}
        />
      ) : (
        <div className="flex animate-pulse flex-col gap-4 p-5" aria-busy>
          <div className="size-24 rounded-2xl bg-surface-2" />
          <div className="h-4 w-3/4 rounded bg-surface-2" />
          <div className="h-4 w-1/2 rounded bg-surface-2" />
        </div>
      )}
    </Sheet>
  );
}

export default EpisodeCard;
