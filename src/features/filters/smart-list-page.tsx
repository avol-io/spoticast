import {
  ArrowLeft,
  ExternalLink,
  ListChecks,
  MoreVertical,
  Pencil,
  Play,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import EmptyState from '../../app/ui/empty-state';
import IconButton from '../../app/ui/icon-button';
import Menu from '../../app/ui/menu';
import PageHeader from '../../app/ui/page-header';
import { isVideoShow } from '../../lib/episodes';
import { useFilters, type SmartList } from '../../lib/storage/filters';
import { toast } from '../../lib/storage/toasts';
import EpisodeActions from '../player/episode-actions';
import { playAll } from '../player/player-controller';
import EpisodeRow from '../podcast/episode-row';
import EpisodeSwipeRow from '../podcast/episode-swipe-row';
import { useSelectableList } from '../selection/selection-store';
import FilterSummary from './filter-summary';
import SmartListEditor from './smart-list-editor';
import { dropSmartPlaylist, useSmartListEpisodes } from './smart-lists';

export function SmartListPage() {
  const { filterId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const list = useFilters((s) => s.smartLists.find((l) => l.id === filterId));
  const deleteSmartList = useFilters((s) => s.deleteSmartList);
  const { episodes, loading } = useSmartListEpisodes(list);
  const [editing, setEditing] = useState<SmartList | null>(null);
  const selection = useSelectableList(
    `smart:${filterId}`,
    'episodes',
    episodes,
  );

  if (!list) {
    return (
      <EmptyState
        title={t('smart.notFound')}
        action={
          <Link to="/playlists" className="font-semibold text-brand">
            {t('smart.title')}
          </Link>
        }
      />
    );
  }

  const remove = () => {
    deleteSmartList(list.id);
    void dropSmartPlaylist(list);
    toast(t('smart.deleted', { name: list.name }));
    navigate('/playlists', { replace: true });
  };

  return (
    <>
      <PageHeader
        title={list.name}
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
                  label: t('smart.edit'),
                  icon: <Pencil />,
                  onSelect: () => setEditing(list),
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
                ...(list.playlistId
                  ? [
                      {
                        label: t('podcast.openInSpotify'),
                        icon: <ExternalLink />,
                        onSelect: () =>
                          window.open(
                            `https://open.spotify.com/playlist/${list.playlistId}`,
                            '_blank',
                            'noopener',
                          ),
                      },
                    ]
                  : []),
                {
                  label: t('smart.delete'),
                  icon: <Trash2 />,
                  danger: true,
                  onSelect: remove,
                },
              ]}
            />
          </>
        }
      />
      <div className="mx-auto max-w-6xl px-4 pb-6 lg:px-8">
        <div className="flex max-w-3xl flex-col gap-3">
          <FilterSummary criteria={list.criteria} />
          <p className="text-sm text-fg-muted">
            {loading ? '…' : t('smart.episodes', { count: episodes.length })} ·{' '}
            {t('smart.scopeHint')}
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
              icon={<SlidersHorizontal />}
              title={t('filters.noMatches')}
            />
          ) : (
            <ul className="divide-y divide-border">
              {episodes.map((episode) => (
                <li key={episode.id}>
                  <EpisodeSwipeRow
                    episode={episode}
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
      <SmartListEditor list={editing} onClose={() => setEditing(null)} />
    </>
  );
}

export default SmartListPage;
