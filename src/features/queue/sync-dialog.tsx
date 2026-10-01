import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Sheet from '../../app/ui/sheet';
import { toast } from '../../lib/storage/toasts';
import { applyMirror, useSavedEpisodes } from '../library/your-episodes';
import { useQueue } from './queue';
import { planMirror } from './queue-logic';

export interface SyncDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Confirms and applies "Your Episodes" = Up Next, listing what gets removed. */
export function SyncDialog({ open, onClose }: SyncDialogProps) {
  const { t } = useTranslation();
  const queue = useQueue();
  const saved = useSavedEpisodes();
  const [busy, setBusy] = useState(false);

  const ready = queue.data && saved.data;
  const plan = ready
    ? planMirror(
        queue.data.episodes.map((ep) => ep.uri),
        saved.data,
      )
    : null;
  const nothing = plan && plan.toAdd.length === 0 && plan.toRemove.length === 0;

  const confirm = async () => {
    if (!plan) return;
    setBusy(true);
    try {
      await applyMirror(plan);
      toast(t('queue.synced'));
      onClose();
    } catch {
      toast(t('errors.generic'), { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} label={t('queue.syncTitle')}>
      <h2 className="text-lg font-bold">{t('queue.syncTitle')}</h2>
      <p className="mt-1 text-sm text-fg-muted">{t('queue.syncDescription')}</p>

      <div className="mt-4 flex flex-col gap-3 text-sm">
        {!plan ? (
          <p className="animate-pulse text-fg-muted">
            {t('podcast.loadingMore')}
          </p>
        ) : nothing ? (
          <p>{t('queue.syncNothing')}</p>
        ) : (
          <>
            {plan.toAdd.length > 0 && (
              <p className="font-medium text-success">
                {t('queue.syncAdd', { count: plan.toAdd.length })}
              </p>
            )}
            {plan.toRemove.length > 0 && (
              <div>
                <p className="font-medium text-danger">
                  {t('queue.syncRemove', { count: plan.toRemove.length })}
                </p>
                <ul className="mt-2 max-h-56 overflow-y-auto rounded-xl bg-surface-2 p-2">
                  {plan.toRemove.map((s) => (
                    <li key={s.episode.uri} className="truncate px-2 py-1">
                      <span className="text-fg-muted">
                        {s.episode.show?.name} ·{' '}
                      </span>
                      {s.episode.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-4 py-2 font-semibold text-fg-muted hover:bg-surface-2"
        >
          {t('queue.cancel')}
        </button>
        <button
          type="button"
          disabled={!plan || !!nothing || busy}
          onClick={() => void confirm()}
          className="rounded-full bg-brand px-5 py-2 font-semibold text-brand-fg disabled:opacity-40"
        >
          {t('queue.syncConfirm')}
        </button>
      </div>
    </Sheet>
  );
}

export default SyncDialog;
