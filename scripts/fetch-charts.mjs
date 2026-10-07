#!/usr/bin/env node
// Downloads Spotify's public podcast charts (podcastcharts.byspotify.com) and
// writes one normalized JSON file per market into public/charts/:
//
//   node scripts/fetch-charts.mjs            # every market
//   node scripts/fetch-charts.mjs it us      # only some markets
//   CHARTS_OUT=dist/charts node scripts/fetch-charts.mjs
//
// No dependencies: it runs in CI without `npm ci`.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// prettier-ignore
export const MARKETS = [
  'ar', 'at', 'au', 'br', 'ca', 'cl', 'co', 'de', 'dk', 'es', 'fi', 'fr', 'gb',
  'id', 'ie', 'in', 'it', 'jp', 'mx', 'nl', 'no', 'nz', 'ph', 'pl', 'se', 'us',
];
const CHARTS = { top: 'top-podcasts', trending: 'trending' };
const API = 'https://podcastcharts.byspotify.com/api/charts';
const LIMIT = 100;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchChart(category, market, attempts = 3) {
  const url = `${API}/${category}?region=${market}&limit=${LIMIT}`;
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Spoticast charts bot',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (error) {
      if (attempt >= attempts) throw new Error(`${url}: ${error.message}`);
      await sleep(1000 * attempt);
    }
  }
}

/** Keeps only what the app shows; drops long descriptions. */
export function normalize(entries) {
  return entries
    .filter(
      (e) =>
        typeof e?.showUri === 'string' && e.showUri.startsWith('spotify:show:'),
    )
    .slice(0, LIMIT)
    .map((e, index) => ({
      rank: index + 1,
      id: e.showUri.slice('spotify:show:'.length),
      name: e.showName ?? '',
      publisher: e.showPublisher ?? '',
      image: e.showImageUrl ?? null,
      move: e.chartRankMove ?? 'UNCHANGED',
    }));
}

async function main() {
  const requested = process.argv.slice(2).map((m) => m.toLowerCase());
  const markets = requested.length
    ? requested.filter((m) => MARKETS.includes(m))
    : MARKETS;
  const outDir = resolve(process.env.CHARTS_OUT ?? 'public/charts');
  await mkdir(outDir, { recursive: true });

  const updatedAt = new Date().toISOString();
  const available = [];
  let failures = 0;
  for (const market of markets) {
    try {
      const [top, trending] = await Promise.all(
        Object.values(CHARTS).map((category) => fetchChart(category, market)),
      );
      const data = {
        market,
        updatedAt,
        top: normalize(top),
        trending: normalize(trending),
      };
      await writeFile(resolve(outDir, `${market}.json`), JSON.stringify(data));
      available.push(market);
      console.log(
        `${market}: top ${data.top.length}, trending ${data.trending.length}`,
      );
    } catch (error) {
      failures++;
      console.error(`${market}: ${error.message}`);
    }
    await sleep(300); // be gentle with the charts site
  }
  await writeFile(
    resolve(outDir, 'index.json'),
    JSON.stringify({ updatedAt, markets: available }),
  );
  // Fail the CI run only if nothing could be downloaded.
  if (available.length === 0 && failures > 0) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
