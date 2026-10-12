import { DIAG_ENABLED, DIAG_WINDOW_MS } from './config';

/**
 * Diagnostics log (beta and dev only): key events of the last minute, kept
 * in localStorage so they survive a reload or iOS killing the app, and sent
 * with a feedback report (see features/feedback). Never log tokens, search
 * queries or anything personal beyond Spotify ids and short names.
 */

export type DiagArea =
  | 'life'
  | 'sdk'
  | 'player'
  | 'cmd'
  | 'queue'
  | 'archive'
  | 'api'
  | 'auth'
  | 'ui'
  | 'error';

export type DiagValue = string | number | boolean | null | undefined;
export type DiagData = Record<string, DiagValue>;

export interface DiagEntry {
  /** Epoch ms. */
  t: number;
  a: DiagArea;
  e: string;
  d?: Record<string, string | number | boolean | null>;
}

const STORAGE_KEY = 'spoticast.diag';
/** Cap on top of the time window, against bursts. */
const MAX_ENTRIES = 1000;
const SAVE_DELAY_MS = 2000;
const MAX_VALUE_CHARS = 200;

let entries: DiagEntry[] = load();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function load(): DiagEntry[] {
  if (!DIAG_ENABLED) return [];
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function prune(now = Date.now()) {
  const from = now - DIAG_WINDOW_MS;
  let start = 0;
  while (start < entries.length && entries[start].t < from) start++;
  start = Math.max(start, entries.length - MAX_ENTRIES);
  if (start > 0) entries = entries.slice(start);
}

function clean(data: DiagData): DiagEntry['d'] {
  const out: NonNullable<DiagEntry['d']> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    out[key] =
      typeof value === 'string' && value.length > MAX_VALUE_CHARS
        ? `${value.slice(0, MAX_VALUE_CHARS)}…`
        : value;
  }
  return out;
}

/** Records an event; a no-op in production, and it never throws. */
export function diag(area: DiagArea, event: string, data?: DiagData): void {
  if (!DIAG_ENABLED) return;
  try {
    const entry: DiagEntry = { t: Date.now(), a: area, e: event };
    if (data) entry.d = clean(data);
    entries.push(entry);
    if (entries.length > MAX_ENTRIES * 1.2) prune(entry.t);
    if (import.meta.env.DEV && import.meta.env.MODE !== 'test')
      console.debug(`[diag] ${area} ${event}`, entry.d ?? '');
    saveTimer ??= setTimeout(saveLog, SAVE_DELAY_MS);
  } catch {
    // Diagnostics must never break the app.
  }
}

/** Writes the log now (the app may be killed once hidden). */
export function saveLog(): void {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  if (!DIAG_ENABLED) return;
  try {
    prune();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full or blocked: the log stays in memory.
  }
}

/** The events of the time window, oldest first. */
export function snapshotLog(now = Date.now()): DiagEntry[] {
  prune(now);
  return entries.filter((entry) => entry.t <= now);
}

export function clearLog(): void {
  entries = [];
  clearTimeout(saveTimer);
  saveTimer = undefined;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** Test hook: read the saved log again, as a new session would. */
export function reloadLog(): void {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  entries = load();
}

/** Id from a Spotify URI (`spotify:episode:<id>`) or id. */
export function shortId(uriOrId: string | null | undefined): string | null {
  if (!uriOrId) return null;
  return uriOrId.slice(uriOrId.lastIndexOf(':') + 1);
}

/** Device ids are long hashes: the start tells them apart. */
export function shortDevice(id: string | null | undefined): string | null {
  return id ? id.slice(0, 8) : null;
}

export function shortName(name: string | null | undefined, max = 40) {
  if (!name) return null;
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}
