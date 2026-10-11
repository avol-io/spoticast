import {
  ArrowLeft,
  ExternalLink,
  ListChecks,
  ListMusic,
  MoreVertical,
  Pencil,
  Play,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import EmptyState from '../../app/ui/empty-state';
import IconButton from '../../app/ui/icon-button';
import Menu from '../../app/ui/menu';
import PageHeader from '../../app/ui/page-header';
import { isVideoShow } from '../../lib/episodes';
import type { Episode } from '../../lib/spotify/types';
import { toast } from '../../lib/storage/toasts';
import EpisodeActions from '../player/episode-actions';
import { playAll } from '../player/player-controller';
import EpisodeRow from '../podcast/episode-row';
import EpisodeSwipeRow from '../podcast/episode-swipe-row';
import { useSelectableList } from '../selection/selection-store';
import {
  deleteManualPlaylist,
  renameManualPlaylist,
  useManualPlaylistEpisodes,
  useManualPlaylists,
  type ManualPlaylist,
} from './manual-playlists';
import PlaylistNameSheet from './playlist-name-sheet';

const none: Episode[] = [];

function ManualPlaylistView({ playlist }: { playlist: ManualPlaylist }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const items = useManualPlaylistEpisodes(playlist.id);
  const episodes = items.data ?? none;
  const loading = items.isPending;
  const [renaming, setRenaming] = useState(false);
  const kind = useMemo(() => ({ playlist }), [playlist]);
  const selection = useSelectableList(`manual:${playlist.id}`, kind, episodes);

  const remove = async () => {
    try {
      await deleteManualPlaylist(playlist);
      toast(t('playlists.deleted', { name: playlist.name }));
      navigate('/playlists', { replace: true });
    } catch {
      toast(t('errors.generic'), { tone: 'error' });
    }
  };

  return (
    <>
      <PageHeader
        title={playlist.name}
        actions={
          <>
            <IconButton
              label={t('podcast.back')}
              onClick={() => navigate('/playlists')}
              className="lg:hidden"
            >
              <ArrowLeft />
            </IconButton>
            <Menu
              label={t('episode.more')}
              icon={<MoreVertical />}
              items={[
                {
                  label: t('playlists.rename'),
                  icon: <Pencil />,
                  onSelect: () => setRenaming(true),
                },
                ...(episodes.length > 0
                  ? [
                      {
                        label: t('selection.select'),
                        icon: <ListChecks />,
                        onSelect: () => selection.start(),
                      },
                    ]
                  : []),
                {
                  label: t('podcast.openInSpotify'),
                  icon: <ExternalLink />,
                  onSelect: () =>
                    window.open(
                      `https://open.spotify.com/playlist/${playlist.id}`,
                      '_blank',
                      'noopener',
                    ),
                },
                {
                  label: t('playlists.delete'),
                  icon: <Trash2 />,
                  danger: true,
                  onSelect: () => void remove(),
                },
              ]}
            />
          </>
        }
      />
      <div className="mx-auto max-w-6xl px-4 pb-6 lg:px-8">
        <div className="flex max-w-3xl flex-col gap-3">
          <p className="text-sm text-fg-muted">
            {loading ? '…' : t('smart.episodes', { count: episodes.length })}
          </p>
          <button
            type="button"
            disabled={loading || episodes.length === 0}
            onClick={() => void playAll(episodes)}
            className="flex items-center gap-1.5 self-start rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-fg disabled:opacity-40"
          >
            <Play className="size-4 fill-current" aria-hidden />
            {t('smart.playAll')}
          </button>
          {!loading && episodes.length === 0 ? (
            <EmptyState
              icon={<ListMusic />}
              title={t('playlists.emptyList')}
              description={t('playlists.emptyListHint')}
            />
          ) : (
            <ul className="divide-y divide-border">
              {episodes.map((episode) => (
                <li key={episode.id}>
                  <EpisodeSwipeRow
                    episode={episode}
                    playlist={playlist}
                    selecting={selection.selecting}
                    onStartSelection={() => selection.start(episode.uri)}
                  >
                    <EpisodeRow
                      episode={episode}
                      showCover
                      eyebrow={episode.show.name}
                      video={isVideoShow(episode.show)}
                      actions={
                        <EpisodeActions
                          episode={episode}
                          video={isVideoShow(episode.show)}
                          playlist={playlist}
                        />
                      }
                    />
                  </EpisodeSwipeRow>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <PlaylistNameSheet
        open={renaming}
        title={t('playlists.rename')}
        submitLabel={t('playlists.save')}
        initialName={playlist.name}
        onSubmit={(name) => renameManualPlaylist(playlist, name)}
        onClose={() => setRenaming(false)}
      />
    </>
  );
}

/** A playlist the user fills by hand ("Add to playlist…"). */
export function ManualPlaylistPage() {
  const { playlistId } = useParams();
  const { t } = useTranslation();
  const playlists = useManualPlaylists();
  const playlist = playlists.data?.find((p) => p.id === playlistId);

  if (playlist) return <ManualPlaylistView playlist={playlist} />;
  if (playlists.isPending) return null;
  return (
    <EmptyState
      title={t('playlists.notFound')}
      action={
        <Link to="/playlists" className="font-semibold text-brand">
          {t('nav.playlists')}
        </Link>
      }
    />
  );
}

export default ManualPlaylistPage;
