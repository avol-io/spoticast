import { useQuery } from '@tanstack/react-query';

/** Markets covered by Spotify's podcast charts (see scripts/fetch-charts.mjs). */
export const CHART_MARKETS = [
  'ar',
  'at',
  'au',
  'br',
  'ca',
  'cl',
  'co',
  'de',
  'dk',
  'es',
  'fi',
  'fr',
  'gb',
  'id',
  'ie',
  'in',
  'it',
  'jp',
  'mx',
  'nl',
  'no',
  'nz',
  'ph',
  'pl',
  'se',
  'us',
] as const;

export type ChartMove = 'UP' | 'DOWN' | 'NEW' | 'UNCHANGED' | string;

export interface ChartEntry {
  rank: number;
  id: string;
  name: string;
  publisher: string;
  image: string | null;
  move: ChartMove;
}

export interface Charts {
  market: string;
  updatedAt: string;
  top: ChartEntry[];
  trending: ChartEntry[];
}

const LANGUAGE_MARKETS: Record<string, string> = {
  it: 'it',
  de: 'de',
  fr: 'fr',
  es: 'es',
  ja: 'jp',
  nl: 'nl',
  sv: 'se',
  da: 'dk',
  fi: 'fi',
  nb: 'no',
  nn: 'no',
  no: 'no',
  pl: 'pl',
  pt: 'br',
  id: 'id',
  en: 'us',
};

const isMarket = (code: string) =>
  (CHART_MARKETS as readonly string[]).includes(code);

/**
 * The user's chart market from the browser: the region of a language tag
 * ("it-IT" → it, "en-GB" → gb), else the language, else the US.
 */
export function defaultMarket(
  languages: readonly string[] = navigator.languages ?? [navigator.language],
): string {
  for (const tag of languages) {
    const region = tag.split('-')[1]?.toLowerCase();
    if (region === 'uk' && isMarket('gb')) return 'gb';
    if (region && isMarket(region)) return region;
  }
  for (const tag of languages) {
    const market = LANGUAGE_MARKETS[tag.slice(0, 2).toLowerCase()];
    if (market) return market;
  }
  return 'us';
}

export function marketName(code: string, lang: string): string {
  try {
    return (
      new Intl.DisplayNames([lang], { type: 'region' }).of(
        code.toUpperCase(),
      ) ?? code
    );
  } catch {
    return code.toUpperCase();
  }
}

/** 🇮🇹 from "it". */
export function flag(code: string): string {
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)),
  );
}

export async function fetchCharts(
  market: string,
  signal?: AbortSignal,
): Promise<Charts | null> {
  const res = await fetch(`${import.meta.env.BASE_URL}charts/${market}.json`, {
    signal,
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // Dev servers answer unknown paths with index.html.
  if (!res.headers.get('content-type')?.includes('json')) return null;
  return res.json();
}

/** Charts are refreshed once a day by the charts workflow. */
export function useCharts(market: string) {
  return useQuery({
    queryKey: ['charts', market],
    queryFn: ({ signal }) => fetchCharts(market, signal),
    staleTime: 6 * 60 * 60_000,
  });
}
