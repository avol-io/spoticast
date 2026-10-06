import type { SmartList } from '../storage/filters';
import type { EpisodeSort, FilterCriteria, ListeningStatus } from './engine';

/**
 * Smart lists synced across devices travel in the description of their
 * Spotify playlist: a readable prefix, then `sc1:` and a base64url payload
 * (or `sc1:local.<updatedAt>` when the config is too long to fit).
 */
export const DESCRIPTION_PREFIX = 'Spoticast smart filter · ';
/** Spotify's limit for playlist descriptions. */
export const MAX_DESCRIPTION = 300;
const MARKER = 'sc1:';
const LOCAL = 'local.';
/** Show ids are 22 base62 chars; 5 are plenty among the shows one follows. */
const SHOW_PREFIX = 5;
const VERSION = 1;

export type SyncedConfig = Pick<
  SmartList,
  'criteria' | 'showIds' | 'includeArchived' | 'sort'
>;
type Encodable = SyncedConfig & Pick<SmartList, 'updatedAt'>;

export type DecodedDescription =
  | { kind: 'none' }
  | { kind: 'invalid' }
  /** Config too long for Spotify: it lives only on the device that wrote it. */
  | { kind: 'local'; updatedAt: number }
  | { kind: 'valid'; updatedAt: number; config: SyncedConfig };

const statusCodes: Record<ListeningStatus, string> = {
  any: 'a',
  'not-started': 'n',
  'in-progress': 'p',
};
const sortCodes: Record<EpisodeSort, string> = {
  newest: 'n',
  oldest: 'o',
  shortest: 's',
  longest: 'l',
};
const reverse = <T extends string>(codes: Record<T, string>) =>
  Object.fromEntries(Object.entries(codes).map(([k, v]) => [v, k])) as Record<
    string,
    T | undefined
  >;
const statusByCode = reverse(statusCodes);
const sortByCode = reverse(sortCodes);

// Spotify HTML-escapes descriptions on read; these chars never get escaped.
const TOKEN = /sc1:([A-Za-z0-9_.-]+)/;
const SHOW_ID = /^[A-Za-z0-9]+$/;

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(value: string): string {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

const showPrefixes = (showIds: string[] | null) =>
  showIds && showIds.map((id) => id.slice(0, SHOW_PREFIX)).join('');

/** The sync payload, or null when the description would exceed Spotify's limit. */
export function encodeSmartList(list: Encodable): string | null {
  const c = list.criteria;
  const payload = [
    VERSION,
    list.updatedAt.toString(36),
    c.minMinutes,
    c.maxMinutes,
    c.withinDays,
    statusCodes[c.status],
    c.text,
    c.videoOnly ? 1 : 0,
    list.includeArchived ? 1 : 0,
    sortCodes[list.sort],
    showPrefixes(list.showIds),
  ];
  const description = `${DESCRIPTION_PREFIX}${MARKER}${toBase64Url(JSON.stringify(payload))}`;
  return description.length <= MAX_DESCRIPTION ? description : null;
}

/** The description to give the playlist of a synced list. */
export function describeSmartList(list: Encodable): string {
  return (
    encodeSmartList(list) ??
    `${DESCRIPTION_PREFIX}${MARKER}${LOCAL}${list.updatedAt.toString(36)}`
  );
}

const isCount = (v: unknown): v is number | null =>
  v === null || (typeof v === 'number' && Number.isInteger(v) && v >= 0);
const isFlag = (v: unknown): v is 0 | 1 => v === 0 || v === 1;

function parseTime(value: unknown): number | null {
  if (typeof value !== 'string' || !/^[0-9a-z]+$/.test(value)) return null;
  const time = parseInt(value, 36);
  return Number.isSafeInteger(time) ? time : null;
}

function parseShows(value: unknown): string[] | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'string' || value.length % SHOW_PREFIX !== 0)
    return undefined;
  if (value && !SHOW_ID.test(value)) return undefined;
  return value.match(new RegExp(`.{${SHOW_PREFIX}}`, 'g')) ?? [];
}

function parsePayload(token: string): DecodedDescription {
  let data: unknown;
  try {
    data = JSON.parse(fromBase64Url(token));
  } catch {
    return { kind: 'invalid' };
  }
  if (!Array.isArray(data) || data.length !== 11 || data[0] !== VERSION)
    return { kind: 'invalid' };
  const [, u, mn, mx, d, st, t, vo, a, o, s] = data;
  const updatedAt = parseTime(u);
  const status = typeof st === 'string' ? statusByCode[st] : undefined;
  const sort = typeof o === 'string' ? sortByCode[o] : undefined;
  const showIds = parseShows(s);
  if (
    updatedAt === null ||
    !isCount(mn) ||
    !isCount(mx) ||
    !isCount(d) ||
    !status ||
    typeof t !== 'string' ||
    !isFlag(vo) ||
    !isFlag(a) ||
    !sort ||
    showIds === undefined
  )
    return { kind: 'invalid' };
  const criteria: FilterCriteria = {
    minMinutes: mn,
    maxMinutes: mx,
    withinDays: d,
    status,
    text: t,
    videoOnly: vo === 1,
  };
  return {
    kind: 'valid',
    updatedAt,
    config: { criteria, showIds, includeArchived: a === 1, sort },
  };
}

export function decodeDescription(
  description: string | null | undefined,
): DecodedDescription {
  const token = description?.match(TOKEN)?.[1];
  if (!token) return { kind: 'none' };
  if (token.startsWith(LOCAL)) {
    const updatedAt = parseTime(token.slice(LOCAL.length));
    return updatedAt === null
      ? { kind: 'invalid' }
      : { kind: 'local', updatedAt };
  }
  return parsePayload(token);
}

/**
 * Whether the playlist description must be rewritten from the local list.
 * A newer config that was too long to sync is left alone: overwriting it with
 * this older copy would lose the other device's edit.
 */
export function shouldWriteDescription(
  list: Encodable,
  remote: string | null | undefined,
): boolean {
  const desired = describeSmartList(list).match(TOKEN)?.[1];
  if (desired === remote?.match(TOKEN)?.[1]) return false;
  const decoded = decodeDescription(remote);
  return !(decoded.kind === 'local' && decoded.updatedAt >= list.updatedAt);
}

/**
 * Maps synced id prefixes back to the followed shows. Prefixes of shows this
 * device doesn't follow are kept, so the next write doesn't drop them.
 */
export function resolveShowIds(
  showIds: string[] | null,
  shows: { id: string }[],
): string[] | null {
  if (!showIds) return null;
  const resolved = showIds.map(
    (id) =>
      shows.find((show) => show.id === id)?.id ??
      shows.find((show) => show.id.startsWith(id.slice(0, SHOW_PREFIX)))?.id ??
      id,
  );
  return [...new Set(resolved)];
}
