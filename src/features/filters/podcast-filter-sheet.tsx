import { X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Sheet from '../../app/ui/sheet';
import {
  emptyCriteria,
  isEmptyCriteria,
  type FilterCriteria,
} from '../../lib/filters/engine';
import { useFilters } from '../../lib/storage/filters';
import { toast } from '../../lib/storage/toasts';
import FilterEditor from './filter-editor';

export interface PodcastFilterSheetProps {
  showId: string;
  open: boolean;
  onClose: () => void;
}

/** Edits the filter of one podcast (applied live) and manages presets. */
export function PodcastFilterSheet({
  showId,
  open,
  onClose,
}: PodcastFilterSheetProps) {
  const { t } = useTranslation();
  const { podcast, presets, setPodcastFilter, savePreset, deletePreset } =
    useFilters();
  const criteria = podcast[showId] ?? emptyCriteria;
  const [presetName, setPresetName] = useState('');

  const apply = (next: FilterCriteria) =>
    setPodcastFilter(showId, isEmptyCriteria(next) ? null : next);
  const save = () => {
    const name = presetName.trim();
    if (!name) return;
    savePreset(name, criteria);
    setPresetName('');
    toast(t('filters.presetSaved', { name }));
  };

  return (
    <Sheet open={open} onClose={onClose} label={t('filters.filter')}>
      <div className="flex items-center justify-between pb-4">
        <h2 className="text-lg font-bold">{t('filters.filter')}</h2>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={isEmptyCriteria(criteria)}
            onClick={() => apply(emptyCriteria)}
            className="rounded-full px-3 py-1.5 text-sm font-semibold text-fg-muted hover:bg-surface-2 disabled:opacity-40"
          >
            {t('filters.clear')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-fg px-4 py-1.5 text-sm font-semibold text-bg"
          >
            {t('filters.apply')}
          </button>
        </div>
      </div>

      <section className="mb-5 flex flex-col gap-2">
        <h3 className="text-xs font-semibold tracking-wider text-fg-subtle uppercase">
          {t('filters.presets')}
        </h3>
        {presets.length === 0 ? (
          <p className="text-sm text-fg-muted">{t('filters.noPresets')}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <li
                key={preset.id}
                className="flex items-center rounded-full bg-surface-2"
              >
                <button
                  type="button"
                  onClick={() => apply(preset.criteria)}
                  className="py-1.5 pr-1 pl-3 text-sm font-medium"
                >
                  {preset.name}
                </button>
                <button
                  type="button"
                  aria-label={t('filters.deletePreset', { name: preset.name })}
                  onClick={() => deletePreset(preset.id)}
                  className="rounded-full p-1.5 text-fg-subtle hover:text-fg"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <FilterEditor value={criteria} onChange={apply} />

      <form
        className="mt-6 flex gap-2 border-t border-border pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <input
          aria-label={t('filters.presetName')}
          placeholder={t('filters.presetName')}
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <button
          type="submit"
          disabled={!presetName.trim() || isEmptyCriteria(criteria)}
          className="rounded-xl bg-surface-3 px-3 py-2 text-sm font-semibold disabled:opacity-40"
        >
          {t('filters.savePreset')}
        </button>
      </form>
    </Sheet>
  );
}

export default PodcastFilterSheet;
