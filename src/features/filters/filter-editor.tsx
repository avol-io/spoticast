import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Switch from '../../app/ui/switch';
import {
  LISTENING_STATUSES,
  type FilterCriteria,
  type ListeningStatus,
} from '../../lib/filters/engine';
import { statusLabels } from './filter-summary';

const MIN_OPTIONS = [5, 10, 15, 20, 30, 45, 60];
const MAX_OPTIONS = [10, 15, 20, 30, 45, 60, 90, 120];
const DAY_CHIPS = [1, 7, 30, 90];

export interface FilterEditorProps {
  value: FilterCriteria;
  onChange: (value: FilterCriteria) => void;
  /** Spotify flags video per show, so this only makes sense across shows. */
  showVideoOption?: boolean;
  /** Podcast pages have an Archived tab instead. */
  showArchivedOption?: boolean;
}

function Field({
  label,
  children,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={htmlFor}
        className="text-xs font-semibold tracking-wider text-fg-subtle uppercase"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const chipClass = (pressed: boolean) =>
  `rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
    pressed ? 'bg-fg text-bg' : 'bg-surface-2 text-fg-muted hover:text-fg'
  }`;

const selectClass =
  'w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm focus:border-brand focus:outline-none';

export function FilterEditor({
  value,
  onChange,
  showVideoOption,
  showArchivedOption,
}: FilterEditorProps) {
  const { t } = useTranslation();
  const ids = { min: useId(), max: useId(), days: useId(), text: useId() };
  const set = (patch: Partial<FilterCriteria>) =>
    onChange({ ...value, ...patch });
  const statusOptions = LISTENING_STATUSES.filter(
    (s) => showArchivedOption || s !== 'archived',
  );
  const toggleStatus = (status: ListeningStatus) => {
    const next = value.statuses.includes(status)
      ? value.statuses.filter((s) => s !== status)
      : statusOptions.filter((s) => s === status || value.statuses.includes(s));
    // Every status ticked is the same as no filter.
    set({ statuses: next.length === statusOptions.length ? [] : next });
  };
  const numberOrNull = (raw: string) => (raw === '' ? null : Number(raw));
  const customDays =
    value.withinDays !== null && !DAY_CHIPS.includes(value.withinDays);
  // Typed text of the custom field: "14" passes through "1", which is a chip.
  const [daysDraft, setDaysDraft] = useState(
    customDays ? String(value.withinDays) : '',
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('filters.minDuration')} htmlFor={ids.min}>
          <select
            id={ids.min}
            className={selectClass}
            value={value.minMinutes ?? ''}
            onChange={(e) => set({ minMinutes: numberOrNull(e.target.value) })}
          >
            <option value="">{t('filters.any')}</option>
            {MIN_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {t('filters.minutes', { count: m })}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('filters.maxDuration')} htmlFor={ids.max}>
          <select
            id={ids.max}
            className={selectClass}
            value={value.maxMinutes ?? ''}
            onChange={(e) => set({ maxMinutes: numberOrNull(e.target.value) })}
          >
            <option value="">{t('filters.any')}</option>
            {MAX_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {t('filters.minutes', { count: m })}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label={t('filters.period')}>
        <div className="flex flex-wrap items-center gap-2">
          {[null, ...DAY_CHIPS].map((days) => (
            <button
              key={days ?? 'any'}
              type="button"
              aria-pressed={value.withinDays === days}
              onClick={() => {
                setDaysDraft('');
                set({ withinDays: days });
              }}
              className={chipClass(value.withinDays === days)}
            >
              {days === null
                ? t('filters.any')
                : t('filters.lastDays', { count: days })}
            </button>
          ))}
          <input
            id={ids.days}
            type="number"
            min={1}
            max={3650}
            inputMode="numeric"
            aria-label={t('filters.customDays')}
            placeholder={t('filters.customDays')}
            value={daysDraft}
            onChange={(e) => {
              setDaysDraft(e.target.value);
              const days = Number(e.target.value);
              set({
                withinDays:
                  e.target.value === '' || days < 1 ? null : Math.round(days),
              });
            }}
            className={`w-36 rounded-full border bg-surface-2 px-3 py-1.5 text-sm focus:outline-none ${
              daysDraft ? 'border-brand' : 'border-border'
            }`}
          />
        </div>
      </Field>

      <Field label={t('filters.status')}>
        <div
          role="group"
          aria-label={t('filters.status')}
          className="flex flex-wrap gap-2"
        >
          <button
            type="button"
            aria-pressed={value.statuses.length === 0}
            onClick={() => set({ statuses: [] })}
            className={chipClass(value.statuses.length === 0)}
          >
            {t('filters.statusAny')}
          </button>
          {statusOptions.map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={value.statuses.includes(status)}
              onClick={() => toggleStatus(status)}
              className={chipClass(value.statuses.includes(status))}
            >
              {t(statusLabels[status])}
            </button>
          ))}
        </div>
      </Field>

      <Field label={t('filters.text')} htmlFor={ids.text}>
        <input
          id={ids.text}
          type="search"
          value={value.text}
          placeholder={t('filters.textPlaceholder')}
          onChange={(e) => set({ text: e.target.value })}
          className={selectClass}
        />
      </Field>

      {showVideoOption && (
        <Switch
          label={t('filters.videoOnly')}
          checked={value.videoOnly}
          onChange={(videoOnly) => set({ videoOnly })}
        />
      )}
    </div>
  );
}

export default FilterEditor;
