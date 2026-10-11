import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Sheet from '../../app/ui/sheet';
import { toast } from '../../lib/storage/toasts';

export interface PlaylistNameSheetProps {
  open: boolean;
  title: string;
  submitLabel: string;
  initialName?: string;
  /** Resolves once saved; the sheet then closes. */
  onSubmit: (name: string) => Promise<unknown>;
  onClose: () => void;
}

/** Asks for the name of a new or renamed playlist. */
export function PlaylistNameSheet({
  open,
  title,
  submitLabel,
  initialName = '',
  onSubmit,
  onClose,
}: PlaylistNameSheetProps) {
  const { t } = useTranslation();
  const id = useId();
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setName(initialName);
  }, [open, initialName]);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await onSubmit(trimmed);
      onClose();
    } catch {
      toast(t('errors.generic'), { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} label={title}>
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <h2 className="text-lg font-bold">{title}</h2>
        <div className="flex flex-col gap-2">
          <label
            htmlFor={id}
            className="text-xs font-semibold tracking-wider text-fg-subtle uppercase"
          >
            {t('playlists.name')}
          </label>
          <input
            id={id}
            required
            value={name}
            placeholder={t('playlists.namePlaceholder')}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 font-semibold text-fg-muted hover:bg-surface-2"
          >
            {t('playlists.cancel')}
          </button>
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="rounded-full bg-brand px-5 py-2 font-semibold text-brand-fg disabled:opacity-40"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

export default PlaylistNameSheet;
