import { Clock, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import SegmentedControl from '../../app/ui/segmented-control';
import type { SearchType } from '../../lib/spotify/endpoints';
import { useRecentSearches } from '../../lib/storage/recent-searches';
import ChartList from './chart-list';
import MarketSelect, { useChartsMarket } from './market-select';
import SearchResults from './search-results';

const DEBOUNCE_MS = 350;

export function SearchPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const type: SearchType =
    params.get('type') === 'episode' ? 'episode' : 'show';
  const [text, setText] = useState(query);
  const [chart, setChart] = useState<'top' | 'trending'>('trending');
  const market = useChartsMarket();
  const { recent, add, clear } = useRecentSearches();

  // Typing updates the URL (and the search) after a short pause.
  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed === query) return;
    const id = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (trimmed) next.set('q', trimmed);
      else next.delete('q');
      setParams(next, { replace: true });
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [text, query, params, setParams]);

  // Back/forward navigation changes the URL: mirror it in the field.
  useEffect(() => setText(query), [query]);

  const setType = (next: SearchType) => {
    const updated = new URLSearchParams(params);
    if (next === 'episode') updated.set('type', 'episode');
    else updated.delete('type');
    setParams(updated, { replace: true });
  };

  return (
    <>
      <header className="pt-safe sticky top-0 z-20 bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 pt-3 pb-3 lg:px-8 lg:pt-5">
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
            {t('nav.search')}
          </h1>
          <form
            role="search"
            className="relative max-w-3xl"
            onSubmit={(e) => {
              e.preventDefault();
              add(text);
              (document.activeElement as HTMLElement | null)?.blur();
            }}
          >
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-fg-subtle"
              aria-hidden
            />
            <input
              type="search"
              enterKeyHint="search"
              aria-label={t('search.placeholder')}
              placeholder={t('search.placeholder')}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-2xl border border-border bg-surface py-3 pr-11 pl-11 text-base focus:border-brand focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {text && (
              <button
                type="button"
                aria-label={t('search.clear')}
                onClick={() => setText('')}
                className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-fg-muted hover:bg-surface-2"
              >
                <X className="size-4" />
              </button>
            )}
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-6 lg:px-8">
        <div className="max-w-3xl">
          {query ? (
            <>
              <div className="pb-3">
                <SegmentedControl<SearchType>
                  label={t('nav.search')}
                  value={type}
                  onChange={setType}
                  options={[
                    { value: 'show', label: t('search.podcasts') },
                    { value: 'episode', label: t('search.episodes') },
                  ]}
                />
              </div>
              <SearchResults
                query={query}
                type={type}
                onOpen={() => add(query)}
              />
            </>
          ) : (
            <>
              {recent.length > 0 && (
                <section className="pb-5">
                  <div className="flex items-center justify-between pb-2">
                    <h2 className="text-xs font-semibold tracking-wider text-fg-subtle uppercase">
                      {t('search.recent')}
                    </h2>
                    <button
                      type="button"
                      onClick={clear}
                      className="text-xs font-semibold text-fg-muted hover:text-fg"
                    >
                      {t('search.clearRecent')}
                    </button>
                  </div>
                  <ul className="flex flex-wrap gap-2">
                    {recent.map((r) => (
                      <li key={r}>
                        <button
                          type="button"
                          onClick={() => setText(r)}
                          className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm hover:bg-surface-3"
                        >
                          <Clock
                            className="size-3.5 text-fg-subtle"
                            aria-hidden
                          />
                          {r}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                <SegmentedControl
                  label={t('search.trending')}
                  value={chart}
                  onChange={setChart}
                  options={[
                    { value: 'trending', label: t('search.trending') },
                    { value: 'top', label: t('search.top') },
                  ]}
                />
                <MarketSelect />
              </div>
              <ChartList market={market} kind={chart} />
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default SearchPage;
