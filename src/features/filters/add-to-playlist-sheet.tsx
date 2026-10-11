import { Check, ListMusic, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { create } from 'zustand';
import Sheet from '../../app/ui/sheet';
import type { Episode } from '../../lib/spotify/types';
import {
  addToManualPlaylist,
  createManualPlaylist,
  removeFromManualPlaylist,
  useManualPlaylists,
  useManualPlaylistsEpisodes,
  type ManualPlaylist,
} from './manual-playlists';
import PlaylistNameSheet from './playlist-name-sheet';

/** Episodes being added; null keeps the sheet closed. */
const useAddToPlaylist = create<{ episodes: Episode[] | null }>()(() => ({
  episodes: null,
}));

export const openAddToPlaylist = (episodes: Episode[]) =>
  useAddToPlaylist.setState({ episodes });

const close = () => useAddToPlaylist.setState({ episodes: null });

function PlaylistChoice({
  playlist,
  episodes,
  held,
}: {
  playlist: ManualPlaylist;
  episodes: Episode[];
  /** Episodes of the playlist; undefined while loading. */
  held: Episode[] | undefined;
}) {
  const { t } = useTranslation();
  const uris = new Set(held?.map((ep) => ep.uri));
  const all = !!held && episodes.every((ep) => uris.has(ep.uri));
  const toggle = () =>
    void (
      all
        ? removeFromManualPlaylist(
            playlist,
            episodes.map((ep) => ep.uri),
          )
        : addToManualPlaylist(playlist, episodes)
    ).catch(() => undefined);
  return (
    <button
      type="button"
      aria-pressed={all}
      disabled={!held}
      onClick={toggle}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-surface-2 disabled:opacity-40"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand">
        <ListMusic className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{playlist.name}</span>
        <span className="block text-xs text-fg-subtle tabular-nums">
          {held ? t('smart.episodes', { count: held.length }) : '…'}
        </span>
      </span>
      {all && <Check className="size-5 shrink-0 text-brand" aria-hidden />}
    </button>
  );
}

function AddToPlaylist({ episodes }: { episodes: Episode[] }) {
  const { t } = useTranslation();
  const [naming, setNaming] = useState(false);
  const playlists = useManualPlaylists();
  const list = playlists.data ?? [];
  const contents = useManualPlaylistsEpisodes(list.map((p) => p.id));
  const subtitle =
    episodes.length === 1
      ? episodes[0].name
      : t('playlists.addMany', { count: episodes.length });

  return (
    <>
      <Sheet open={!naming} onClose={close} label={t('playlists.addTitle')}>
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-bold">{t('playlists.addTitle')}</h2>
            <p className="truncate text-sm text-fg-muted">{subtitle}</p>
          </div>
          {playlists.isPending ? (
            <p className="text-sm text-fg-muted">…</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-fg-muted">
              {t('playlists.noPlaylists')}
            </p>
          ) : (
            <ul className="-mx-3 flex flex-col">
              {list.map((playlist, i) => (
                <li key={playlist.id}>
                  <PlaylistChoice
                    playlist={playlist}
                    episodes={episodes}
                    held={contents[i]?.data}
                  />
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => setNaming(true)}
              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-brand hover:bg-surface-2"
            >
              <Plus className="size-4" aria-hidden />
              {t('playlists.new')}
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded-full bg-brand px-5 py-2 font-semibold text-brand-fg"
            >
              {t('playlists.done')}
            </button>
          </div>
        </div>
      </Sheet>
      <PlaylistNameSheet
        open={naming}
        title={t('playlists.new')}
        submitLabel={t('playlists.create')}
        onSubmit={async (name) => {
          await createManualPlaylist(name, episodes);
          close();
        }}
        onClose={() => setNaming(false)}
      />
    </>
  );
}

/**
 * Picks the playlists to put one or more episodes in (opened with
 * `openAddToPlaylist`). Mounted once by the app shell.
 */
export function AddToPlaylistSheet() {
  const episodes = useAddToPlaylist((s) => s.episodes);
  return episodes ? <AddToPlaylist episodes={episodes} /> : null;
}

export default AddToPlaylistSheet;
