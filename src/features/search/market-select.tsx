import { useTranslation } from 'react-i18next';
import {
  CHART_MARKETS,
  defaultMarket,
  flag,
  marketName,
} from '../../lib/charts';
import { useSettings } from '../../lib/storage/settings';

/** Market used for charts: the user's choice or the browser's country. */
export function useChartsMarket(): string {
  const chosen = useSettings((s) => s.chartsMarket);
  return chosen ?? defaultMarket();
}

export function MarketSelect({ className = '' }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const chosen = useSettings((s) => s.chartsMarket);
  const setChartsMarket = useSettings((s) => s.setChartsMarket);
  const auto = defaultMarket();
  const markets = [...CHART_MARKETS].sort((a, b) =>
    marketName(a, i18n.language).localeCompare(
      marketName(b, i18n.language),
      i18n.language,
    ),
  );

  return (
    <select
      aria-label={t('search.country')}
      value={chosen ?? 'auto'}
      onChange={(e) =>
        setChartsMarket(e.target.value === 'auto' ? null : e.target.value)
      }
      className={`rounded-full border border-border bg-surface-2 px-3 py-1.5 text-sm focus:border-brand focus:outline-none ${className}`}
    >
      <option value="auto">
        {flag(auto)}{' '}
        {t('search.automatic', { country: marketName(auto, i18n.language) })}
      </option>
      {markets.map((code) => (
        <option key={code} value={code}>
          {flag(code)} {marketName(code, i18n.language)}
        </option>
      ))}
    </select>
  );
}

export default MarketSelect;
