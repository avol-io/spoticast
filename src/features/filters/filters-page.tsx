import { Play, Plus, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import EmptyState from '../../app/ui/empty-state';
import PageHeader from '../../app/ui/page-header';
import { useFilters, type SmartList } from '../../lib/storage/filters';
import { playAll } from '../player/player-controller';
import { criteriaSummary } from './filter-summary';
import SmartListEditor, { newSmartList } from './smart-list-editor';
import { useSmartListEpisodes } from './smart-lists';

function SmartListCard({ list }: { list: SmartList }) {
  const { t } = useTranslation();
  const { episodes, loading } = useSmartListEpisodes(list);
  const summary = criteriaSummary(list.criteria, t).join(' · ');
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-surface pr-3 transition-colors hover:bg-surface-2">
      <Link
        to={`/playlists/${list.id}`}
        className="flex min-w-0 flex-1 items-center gap-4 py-3.5 pl-4"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-semibold">{list.name}</span>
            {list.spotifyPlaylist && (
              <span
                title={`Spoticast - ${list.name}`}
                className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success"
              >
                SPOTIFY
              </span>
            )}
          </span>
          <span className="block truncate text-sm text-fg-muted">
            {summary || t('smart.allPodcasts')}
          </span>
          <span className="block text-xs text-fg-subtle tabular-nums">
            {loading ? '…' : t('smart.episodes', { count: episodes.length })}
          </span>
        </span>
      </Link>
      <button
        type="button"
        aria-label={t('smart.playList', { name: list.name })}
        title={t('smart.playList', { name: list.name })}
        disabled={loading || episodes.length === 0}
        onClick={() => void playAll(episodes)}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-brand-fg transition-transform active:scale-90 disabled:opacity-40"
      >
        <Play className="ml-0.5 size-4 fill-current" aria-hidden />
      </button>
    </div>
  );
}

export function FiltersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const smartLists = useFilters((s) => s.smartLists);
  const [editing, setEditing] = useState<SmartList | null>(null);

  const newButton = (
    <button
      type="button"
      onClick={() => setEditing(newSmartList())}
      className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-fg"
    >
      <Plus className="size-4" aria-hidden />
      {t('smart.new')}
    </button>
  );

  return (
    <>
      <PageHeader
        title={t('smart.title')}
        actions={smartLists.length > 0 && newButton}
      />
      <div className="mx-auto max-w-6xl px-4 pb-6 lg:px-8">
        <div className="max-w-3xl">
          {smartLists.length === 0 ? (
            <EmptyState
              icon={<SlidersHorizontal />}
              title={t('smart.empty')}
              description={`${t('smart.intro')} ${t('smart.emptyHint')}`}
              action={newButton}
            />
          ) : (
            <>
              <p className="pb-3 text-sm text-fg-muted">{t('smart.intro')}</p>
              <ul className="flex flex-col gap-2">
                {smartLists.map((list) => (
                  <li key={list.id}>
                    <SmartListCard list={list} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
      <SmartListEditor
        list={editing}
        onClose={() => setEditing(null)}
        onSaved={(list) => navigate(`/playlists/${list.id}`)}
      />
    </>
  );
}

export default FiltersPage;
