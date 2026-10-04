import { ArrowDown, ArrowUp, Minus, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import EmptyState from '../../app/ui/empty-state';
import { useCharts, type ChartEntry, type ChartMove } from '../../lib/charts';
import ShowResultRow from './show-result-row';

function MoveBadge({ move }: { move: ChartMove }) {
  const { t } = useTranslation();
  if (move === 'NEW') {
    return (
      <span className="shrink-0 rounded bg-brand/15 px-1.5 py-0.5 text-[10px] font-bold text-brand uppercase">
        {t('search.moveNew')}
      </span>
    );
  }
  if (move === 'UP')
    return (
      <ArrowUp
        className="size-4 shrink-0 text-success"
        aria-label={t('search.moveUp')}
      />
    );
  if (move === 'DOWN')
    return (
      <ArrowDown
        className="size-4 shrink-0 text-danger"
        aria-label={t('search.moveDown')}
      />
    );
  return <Minus className="size-4 shrink-0 text-fg-subtle" aria-hidden />;
}

export interface ChartListProps {
  market: string;
  kind: 'top' | 'trending';
}

/** Spotify's Top or Trending podcasts of a market (static JSON). */
export function ChartList({ market, kind }: ChartListProps) {
  const { t, i18n } = useTranslation();
  const charts = useCharts(market);

  if (charts.isPending) {
    return (
      <ul className="animate-pulse">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="flex items-center gap-3 py-2">
            <div className="size-14 rounded-lg bg-surface-2" />
            <div className="h-4 w-1/2 rounded bg-surface-2" />
          </li>
        ))}
      </ul>
    );
  }
  if (!charts.data) {
    return (
      <EmptyState icon={<TrendingUp />} title={t('search.chartsUnavailable')} />
    );
  }

  const entries: ChartEntry[] = charts.data[kind];
  const updated = new Intl.DateTimeFormat(i18n.language, {
    day: 'numeric',
    month: 'long',
  }).format(new Date(charts.data.updatedAt));

  return (
    <>
      <ol className="flex flex-col">
        {entries.map((entry) => (
          <li key={entry.id}>
            <ShowResultRow
              rank={entry.rank}
              show={{
                id: entry.id,
                uri: `spotify:show:${entry.id}`,
                name: entry.name,
                images: entry.image
                  ? [{ url: entry.image, width: 300, height: 300 }]
                  : [],
              }}
              subtitle={entry.publisher}
              badge={<MoveBadge move={entry.move} />}
            />
          </li>
        ))}
      </ol>
      <p className="py-4 text-center text-xs text-fg-subtle">
        {t('search.updated', { date: updated })}
      </p>
    </>
  );
}

export default ChartList;
