import { getAccessToken } from './auth';
import type { Paging } from './types';

export const API_BASE = 'https://api.spotify.com/v1';
const MAX_CONCURRENT = 4;
const MAX_RATE_LIMIT_RETRIES = 3;

export class SpotifyApiError extends Error {
  override name = 'SpotifyApiError';
  constructor(
    readonly status: number,
    message: string,
    readonly reason?: string,
  ) {
    super(message);
  }
}

// Spotify rate-limits per app over a rolling window: cap parallel requests so
// opening the home (one request per show) doesn't burst.
let active = 0;
const waiting: (() => void)[] = [];

async function acquire() {
  if (active < MAX_CONCURRENT) {
    active++;
    return;
  }
  await new Promise<void>((resolve) => waiting.push(resolve));
}

function release() {
  const next = waiting.shift();
  if (next) next();
  else active--;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = new URL(path.startsWith('http') ? path : `${API_BASE}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

/**
 * Calls the Web API with the user's token. Retries once after refreshing the
 * token on 401 and waits out Retry-After on 429. Resolves to undefined for
 * empty responses.
 */
export async function spotify<T>(
  path: string,
  { method = 'GET', query, body, signal }: RequestOptions = {},
): Promise<T> {
  const url = buildUrl(path, query);
  let forceRefresh = false;
  let rateLimitRetries = 0;

  for (;;) {
    const token = await getAccessToken({ forceRefresh });
    await acquire();
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        signal,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body !== undefined && { 'Content-Type': 'application/json' }),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } finally {
      release();
    }

    if (res.status === 401 && !forceRefresh) {
      forceRefresh = true;
      continue;
    }
    if (res.status === 429 && rateLimitRetries < MAX_RATE_LIMIT_RETRIES) {
      rateLimitRetries++;
      const seconds =
        Number(res.headers.get('Retry-After')) || 2 ** rateLimitRetries;
      await sleep(seconds * 1000);
      continue;
    }
    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      throw new SpotifyApiError(
        res.status,
        detail?.error?.message ?? `HTTP ${res.status}`,
        detail?.error?.reason,
      );
    }

    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }
}

/** Follows `next` links and returns every item of a paged endpoint. */
export async function getAll<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T[]> {
  const items: T[] = [];
  let page = await spotify<Paging<T>>(path, options);
  items.push(...page.items);
  while (page.next) {
    page = await spotify<Paging<T>>(page.next, { signal: options.signal });
    items.push(...page.items);
  }
  return items;
}

/** Splits a list into chunks of at most `size` (API batch limits). */
export function chunk<T>(list: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < list.length; i += size)
    chunks.push(list.slice(i, i + size));
  return chunks;
}
