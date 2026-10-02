import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import type { FilterCriteria } from '../../lib/filters/engine';

/** Short human-readable parts of a filter, e.g. ["≤ 30 min", "last 7 days"]. */
export function criteriaSummary(c: FilterCriteria, t: TFunction): string[] {
  const parts: string[] = [];
  if (c.minMinutes !== null)
    parts.push(t('filters.summaryMin', { count: c.minMinutes }));
  if (c.maxMinutes !== null)
    parts.push(t('filters.summaryMax', { count: c.maxMinutes }));
  if (c.withinDays !== null)
    parts.push(t('filters.summaryDays', { count: c.withinDays }));
  if (c.status === 'not-started') parts.push(t('filters.statusNotStarted'));
  if (c.status === 'in-progress') parts.push(t('filters.statusInProgress'));
  if (c.text.trim())
    parts.push(t('filters.summaryText', { text: c.text.trim() }));
  if (c.videoOnly) parts.push(t('filters.summaryVideo'));
  return parts;
}

export interface FilterSummaryProps {
  criteria: FilterCriteria;
  onClear?: () => void;
}

/** Chips describing the active filter, with an optional "clear" button. */
export function FilterSummary({ criteria, onClear }: FilterSummaryProps) {
  const { t } = useTranslation();
  const parts = criteriaSummary(criteria, t);
  if (parts.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {parts.map((part) => (
        <span
          key={part}
          className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent"
        >
          {part}
        </span>
      ))}
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="px-2 py-1 text-xs font-semibold text-fg-muted hover:text-fg"
        >
          {t('filters.clear')}
        </button>
      )}
    </div>
  );
}

export default FilterSummary;
