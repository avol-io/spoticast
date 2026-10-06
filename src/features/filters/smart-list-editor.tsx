import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Sheet from '../../app/ui/sheet';
import Switch from '../../app/ui/switch';
import { pickImage } from '../../lib/episodes';
import { emptyCriteria, type EpisodeSort } from '../../lib/filters/engine';
import { encodeSmartList } from '../../lib/filters/smart-list-codec';
import {
  newSmartListId,
  useFilters,
  type SmartList,
} from '../../lib/storage/filters';
import { toast } from '../../lib/storage/toasts';
import { useSavedShows } from '../library/queries';
import FilterEditor from './filter-editor';
import { dropSmartPlaylist, syncSmartPlaylist } from './smart-lists';

export function newSmartList(): SmartList {
  return {
    id: newSmartListId(),
    name: '',
    criteria: { ...emptyCriteria, status: 'not-started' },
    showIds: null,
    includeArchived: false,
    sort: 'newest',
    spotifyPlaylist: false,
    playlistId: null,
    playlistName: null,
    playlistDescription: null,
    updatedAt: 0,
  };
}

export interface SmartListEditorProps {
  list: SmartList | null;
  onClose: () => void;
  onSaved?: (list: SmartList) => void;
}

const inputClass =
  'w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm focus:border-brand focus:outline-none';

/** Creates or edits a smart filter; `list` null keeps the sheet closed. */
export function SmartListEditor({
  list,
  onClose,
  onSaved,
}: SmartListEditorProps) {
  const { t } = useTranslation();
  const saveSmartList = useFilters((s) => s.saveSmartList);
  const saved = useSavedShows();
  const [draft, setDraft] = useState<SmartList | null>(list);
  const ids = { name: useId(), sort: useId() };

  useEffect(() => setDraft(list), [list]);
  if (!draft) return null;
  const set = (patch: Partial<SmartList>) => setDraft({ ...draft, ...patch });
  const shows = saved.data?.map((s) => s.show) ?? [];

  const toggleShow = (id: string) => {
    const current = draft.showIds ?? [];
    set({
      showIds: current.includes(id)
        ? current.filter((s) => s !== id)
        : [...current, id],
    });
  };

  const save = async () => {
    const next = saveSmartList({ ...draft, name: draft.name.trim() });
    onSaved?.(next);
    onClose();
    if (list?.spotifyPlaylist && !next.spotifyPlaylist)
      await dropSmartPlaylist(next);
    if (next.spotifyPlaylist) {
      try {
        await syncSmartPlaylist(next);
        toast(t('smart.playlistSynced', { name: `Spoticast - ${next.name}` }));
      } catch {
        toast(t('errors.generic'), { tone: 'error' });
      }
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      label={list?.name ? t('smart.edit') : t('smart.new')}
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <h2 className="text-lg font-bold">
          {list?.name ? t('smart.edit') : t('smart.new')}
        </h2>

        <div className="flex flex-col gap-2">
          <label
            htmlFor={ids.name}
            className="text-xs font-semibold tracking-wider text-fg-subtle uppercase"
          >
            {t('smart.name')}
          </label>
          <input
            id={ids.name}
            required
            value={draft.name}
            placeholder={t('smart.namePlaceholder')}
            onChange={(e) => set({ name: e.target.value })}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-3">
          <Switch
            label={t('smart.allPodcasts')}
            checked={draft.showIds === null}
            onChange={(all) => set({ showIds: all ? null : [] })}
          />
          {draft.showIds !== null && (
            <ul
              aria-label={t('smart.choosePodcasts')}
              className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-xl bg-surface-2 p-2"
            >
              {shows.map((show) => (
                <li key={show.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-3">
                    <input
                      type="checkbox"
                      checked={draft.showIds?.includes(show.id) ?? false}
                      onChange={() => toggleShow(show.id)}
                      className="size-4 accent-[var(--brand)]"
                    />
                    <img
                      src={pickImage(show.images, 64)}
                      alt=""
                      className="size-8 rounded-md object-cover"
                    />
                    <span className="truncate text-sm">{show.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <FilterEditor
          value={draft.criteria}
          onChange={(criteria) => set({ criteria })}
          showVideoOption
        />

        <div className="flex flex-col gap-2">
          <label
            htmlFor={ids.sort}
            className="text-xs font-semibold tracking-wider text-fg-subtle uppercase"
          >
            {t('smart.sort')}
          </label>
          <select
            id={ids.sort}
            value={draft.sort}
            onChange={(e) => set({ sort: e.target.value as EpisodeSort })}
            className={inputClass}
          >
            <option value="newest">{t('smart.sortNewest')}</option>
            <option value="oldest">{t('smart.sortOldest')}</option>
            <option value="shortest">{t('smart.sortShortest')}</option>
            <option value="longest">{t('smart.sortLongest')}</option>
          </select>
        </div>

        <Switch
          label={t('smart.includeArchived')}
          checked={draft.includeArchived}
          onChange={(includeArchived) => set({ includeArchived })}
        />
        <div className="flex flex-col gap-2">
          <Switch
            label={t('smart.spotifyPlaylist')}
            description={`${t('smart.spotifyPlaylistHint', {
              name: draft.name.trim() || '…',
            })} ${t('smart.syncHint')}`}
            checked={draft.spotifyPlaylist}
            onChange={(spotifyPlaylist) => set({ spotifyPlaylist })}
          />
          {draft.spotifyPlaylist && !encodeSmartList(draft) && (
            <p role="status" className="text-xs text-danger">
              {t('smart.syncTooLong')}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 font-semibold text-fg-muted hover:bg-surface-2"
          >
            {t('smart.cancel')}
          </button>
          <button
            type="submit"
            disabled={
              !draft.name.trim() ||
              (draft.showIds !== null && draft.showIds.length === 0)
            }
            className="rounded-full bg-brand px-5 py-2 font-semibold text-brand-fg disabled:opacity-40"
          >
            {t('smart.save')}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

export default SmartListEditor;
