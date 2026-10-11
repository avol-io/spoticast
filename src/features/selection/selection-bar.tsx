import {
  Archive,
  ListEnd,
  ListMinus,
  ListPlus,
  ListStart,
  X,
} from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import IconButton from '../../app/ui/icon-button';
import { toast } from '../../lib/storage/toasts';
import { archiveEpisodes } from '../archive/use-archive';
import { openAddToPlaylist } from '../filters/add-to-playlist-sheet';
import { removeFromManualPlaylist } from '../filters/manual-playlists';
import { usePlayer } from '../player/player-store';
import { insertIntoQueue, removeManyFromQueue } from '../queue/queue';
import { useSelection } from './selection-store';

function Action({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-40 [&>svg]:size-5"
    >
      {icon}
      <span className="max-w-full truncate">{label}</span>
    </button>
  );
}

/** Bulk actions for the episodes selected in the current list. */
export function SelectionBar() {
  const { t } = useTranslation();
  const { scope, kind, episodes, selected, selectAll, clear } = useSelection();
  const nowPlayingUri = usePlayer((s) => s.nowPlaying?.uri);

  useEffect(() => {
    if (!scope) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && clear();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [scope, clear]);

  if (!scope) return null;
  const chosen = episodes.filter((ep) => selected.includes(ep.uri));
  const playlist = typeof kind === 'object' ? kind.playlist : null;
  const none = chosen.length === 0;
  const run = (action: () => Promise<unknown> | void) => {
    clear();
    void Promise.resolve(action()).catch(() => undefined);
  };

  return (
    <div
      role="toolbar"
      aria-label={t('selection.actions')}
      className="pb-safe border-t border-border bg-surface/95 px-2 pt-1 backdrop-blur-md lg:mx-auto lg:max-w-6xl lg:rounded-t-2xl lg:border-x lg:px-8"
    >
      <div className="flex items-center gap-2">
        <IconButton label={t('selection.cancel')} onClick={clear}>
          <X />
        </IconButton>
        <p className="flex-1 text-sm font-semibold" aria-live="polite">
          {t('selection.selected', { count: chosen.length })}
        </p>
        <button
          type="button"
          onClick={selectAll}
          className="rounded-full px-3 py-1.5 text-sm font-semibold text-brand hover:bg-surface-2"
        >
          {t('selection.selectAll')}
        </button>
      </div>
      <div className="flex gap-1 pb-2">
        <Action
          icon={<ListStart />}
          label={t('selection.toTop')}
          disabled={none}
          onClick={() =>
            run(async () => {
              await insertIntoQueue(chosen, 'next', nowPlayingUri);
              toast(t('selection.addedNext', { count: chosen.length }));
            })
          }
        />
        <Action
          icon={<ListEnd />}
          label={t('selection.toBottom')}
          disabled={none}
          onClick={() =>
            run(async () => {
              await insertIntoQueue(chosen, 'last');
              toast(t('selection.addedLast', { count: chosen.length }));
            })
          }
        />
        {kind === 'queue' && (
          <Action
            icon={<ListMinus />}
            label={t('selection.remove')}
            disabled={none}
            onClick={() =>
              run(() => removeManyFromQueue(chosen.map((ep) => ep.uri)))
            }
          />
        )}
        {playlist && (
          <Action
            icon={<ListMinus />}
            label={t('selection.removeFromPlaylist')}
            disabled={none}
            onClick={() =>
              run(() =>
                removeFromManualPlaylist(
                  playlist,
                  chosen.map((ep) => ep.uri),
                ),
              )
            }
          />
        )}
        <Action
          icon={<ListPlus />}
          label={t('selection.addToPlaylist')}
          disabled={none}
          onClick={() => run(() => openAddToPlaylist(chosen))}
        />
        <Action
          icon={<Archive />}
          label={t('selection.archive')}
          disabled={none}
          onClick={() => run(() => archiveEpisodes(chosen))}
        />
      </div>
    </div>
  );
}

export default SelectionBar;
