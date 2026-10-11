import {
  ListMusic,
  Play,
  Plus,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import EmptyState from '../../app/ui/empty-state';
import Menu from '../../app/ui/menu';
import PageHeader from '../../app/ui/page-header';
import { useFilters, type SmartList } from '../../lib/storage/filters';
import { playAll } from '../player/player-controller';
import { criteriaSummary } from './filter-summary';
import {
  createManualPlaylist,
  useManualPlaylistEpisodes,
  useManualPlaylists,
  type ManualPlaylist,
} from './manual-playlists';
import PlaylistNameSheet from './playlist-name-sheet';
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

function ManualPlaylistCard({ playlist }: { playlist: ManualPlaylist }) {
  const { t } = useTranslation();
  const items = useManualPlaylistEpisodes(playlist.id);
  const episodes = items.data ?? [];
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-surface pr-3 transition-colors hover:bg-surface-2">
      <Link
        to={`/playlists/m/${playlist.id}`}
        className="flex min-w-0 flex-1 items-center gap-4 py-3.5 pl-4"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
          <ListMusic className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{playlist.name}</span>
          <span className="block text-xs text-fg-subtle tabular-nums">
            {items.isPending
              ? '…'
              : t('smart.episodes', { count: episodes.length })}
          </span>
        </span>
      </Link>
      <button
        type="button"
        aria-label={t('smart.playList', { name: playlist.name })}
        title={t('smart.playList', { name: playlist.name })}
        disabled={episodes.length === 0}
        onClick={() => void playAll(episodes)}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-brand-fg transition-transform active:scale-90 disabled:opacity-40"
      >
        <Play className="ml-0.5 size-4 fill-current" aria-hidden />
      </button>
    </div>
  );
}

function Section({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-fg-muted">{intro}</p>
      </div>
      {children}
    </section>
  );
}

const newButtonClass =
  'flex items-center gap-1.5 self-start rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-fg';

/** Manual playlists and smart playlists. */
export function FiltersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const smartLists = useFilters((s) => s.smartLists);
  const manual = useManualPlaylists();
  const playlists = manual.data ?? [];
  const [editing, setEditing] = useState<SmartList | null>(null);
  const [naming, setNaming] = useState(false);

  const newPlaylist = (
    <button
      type="button"
      onClick={() => setNaming(true)}
      className={newButtonClass}
    >
      <Plus className="size-4" aria-hidden />
      {t('playlists.new')}
    </button>
  );
  const newSmart = (
    <button
      type="button"
      onClick={() => setEditing(newSmartList())}
      className={newButtonClass}
    >
      <Plus className="size-4" aria-hidden />
      {t('smart.new')}
    </button>
  );
  const empty =
    !manual.isPending && playlists.length === 0 && smartLists.length === 0;

  return (
    <>
      <PageHeader
        title={t('nav.playlists')}
        actions={
          !empty && (
            <Menu
              label={t('playlists.new')}
              icon={<Plus />}
              items={[
                {
                  label: t('playlists.new'),
                  icon: <ListMusic />,
                  onSelect: () => setNaming(true),
                },
                {
                  label: t('smart.new'),
                  icon: <Sparkles />,
                  onSelect: () => setEditing(newSmartList()),
                },
              ]}
            />
          )
        }
      />
      <div className="mx-auto max-w-6xl px-4 pb-6 lg:px-8">
        <div className="max-w-3xl">
          {empty ? (
            <EmptyState
              icon={<SlidersHorizontal />}
              title={t('playlists.empty')}
              description={t('playlists.emptyHint')}
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  {newPlaylist}
                  {newSmart}
                </div>
              }
            />
          ) : (
            <div className="flex flex-col gap-8">
              <Section title={t('playlists.mine')} intro={t('playlists.intro')}>
                {manual.isPending ? (
                  <p className="text-sm text-fg-muted">…</p>
                ) : playlists.length === 0 ? (
                  newPlaylist
                ) : (
                  <ul className="flex flex-col gap-2">
                    {playlists.map((playlist) => (
                      <li key={playlist.id}>
                        <ManualPlaylistCard playlist={playlist} />
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
              <Section title={t('smart.title')} intro={t('smart.intro')}>
                {smartLists.length === 0 ? (
                  newSmart
                ) : (
                  <ul className="flex flex-col gap-2">
                    {smartLists.map((list) => (
                      <li key={list.id}>
                        <SmartListCard list={list} />
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>
          )}
        </div>
      </div>
      <SmartListEditor
        list={editing}
        onClose={() => setEditing(null)}
        onSaved={(list) => navigate(`/playlists/${list.id}`)}
      />
      <PlaylistNameSheet
        open={naming}
        title={t('playlists.new')}
        submitLabel={t('playlists.create')}
        onSubmit={async (name) => {
          const playlist = await createManualPlaylist(name);
          navigate(`/playlists/m/${playlist.id}`);
        }}
        onClose={() => setNaming(false)}
      />
    </>
  );
}

export default FiltersPage;
