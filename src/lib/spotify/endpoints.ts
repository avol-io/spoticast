import { chunk, getAll, spotify } from './client';
import type {
  Device,
  Episode,
  Paging,
  PlaybackState,
  PlaylistItem,
  SavedEpisode,
  SavedShow,
  SearchResults,
  Show,
  SimplifiedEpisode,
  SimplifiedPlaylist,
  SnapshotResponse,
  User,
} from './types';

/** Spotify's max page size for shows, episodes and playlist items. */
export const PAGE_SIZE = 50;
export const SEARCH_PAGE_SIZE = 10;
/** Limits of the batch endpoints. */
const LIBRARY_BATCH = 40;
const PLAYLIST_BATCH = 100;
/** Use the market of the logged-in user (resume points need it too). */
const market = 'from_token';

// --- User & library ---------------------------------------------------------

export const getMe = () => spotify<User>('/me');

export const getSavedShows = (signal?: AbortSignal) =>
  getAll<SavedShow>('/me/shows', { query: { limit: PAGE_SIZE }, signal });

export const getSavedEpisodes = (signal?: AbortSignal) =>
  getAll<SavedEpisode>('/me/episodes', {
    query: { limit: PAGE_SIZE, market },
    signal,
  });

/** Saves shows (follow) or episodes ("Your Episodes") by URI. */
export async function saveToLibrary(uris: string[]) {
  for (const batch of chunk(uris, LIBRARY_BATCH)) {
    await spotify<void>('/me/library', {
      method: 'PUT',
      query: { uris: batch.join(',') },
    });
  }
}

export async function removeFromLibrary(uris: string[]) {
  for (const batch of chunk(uris, LIBRARY_BATCH)) {
    await spotify<void>('/me/library', {
      method: 'DELETE',
      query: { uris: batch.join(',') },
    });
  }
}

export async function libraryContains(uris: string[]): Promise<boolean[]> {
  const results: boolean[] = [];
  for (const batch of chunk(uris, LIBRARY_BATCH)) {
    results.push(
      ...(await spotify<boolean[]>('/me/library/contains', {
        query: { uris: batch.join(',') },
      })),
    );
  }
  return results;
}

// --- Shows & episodes -------------------------------------------------------

export const getShow = (id: string, signal?: AbortSignal) =>
  spotify<Show>(`/shows/${id}`, { query: { market }, signal });

export const getShowEpisodes = (
  id: string,
  offset = 0,
  signal?: AbortSignal,
  limit = PAGE_SIZE,
) =>
  spotify<Paging<SimplifiedEpisode>>(`/shows/${id}/episodes`, {
    query: { market, limit, offset },
    signal,
  });

export const getEpisode = (id: string, signal?: AbortSignal) =>
  spotify<Episode>(`/episodes/${id}`, { query: { market }, signal });

export type SearchType = 'show' | 'episode';

export const search = (
  q: string,
  type: SearchType,
  offset = 0,
  signal?: AbortSignal,
) =>
  spotify<SearchResults>('/search', {
    // Development Mode caps search pages at 10 results.
    query: { q, type, market, limit: SEARCH_PAGE_SIZE, offset },
    signal,
  });

// --- Playlists --------------------------------------------------------------

export const getMyPlaylists = (signal?: AbortSignal) =>
  getAll<SimplifiedPlaylist>('/me/playlists', {
    query: { limit: PAGE_SIZE },
    signal,
  });

export const getPlaylist = (id: string, signal?: AbortSignal) =>
  spotify<SimplifiedPlaylist>(`/playlists/${id}`, {
    query: {
      fields:
        'id,uri,name,description,public,collaborative,snapshot_id,owner,images,external_urls',
    },
    signal,
  });

export const createPlaylist = (name: string, description: string) =>
  spotify<SimplifiedPlaylist>('/me/playlists', {
    method: 'POST',
    body: { name, description, public: false },
  });

export const updatePlaylistDetails = (
  id: string,
  details: { name?: string; description?: string },
) => spotify<void>(`/playlists/${id}`, { method: 'PUT', body: details });

export const getPlaylistItems = (id: string, signal?: AbortSignal) =>
  getAll<PlaylistItem>(`/playlists/${id}/items`, {
    query: { limit: PAGE_SIZE, additional_types: 'episode', market },
    signal,
  });

export async function addPlaylistItems(
  id: string,
  uris: string[],
  position?: number,
): Promise<SnapshotResponse> {
  let snapshot: SnapshotResponse = { snapshot_id: '' };
  let offset = position;
  for (const batch of chunk(uris, PLAYLIST_BATCH)) {
    snapshot = await spotify<SnapshotResponse>(`/playlists/${id}/items`, {
      method: 'POST',
      body: { uris: batch, ...(offset !== undefined && { position: offset }) },
    });
    if (offset !== undefined) offset += batch.length;
  }
  return snapshot;
}

/** Removes every occurrence of the given URIs. */
export async function removePlaylistItems(
  id: string,
  uris: string[],
): Promise<SnapshotResponse> {
  let snapshot: SnapshotResponse = { snapshot_id: '' };
  for (const batch of chunk(uris, PLAYLIST_BATCH)) {
    snapshot = await spotify<SnapshotResponse>(`/playlists/${id}/items`, {
      method: 'DELETE',
      body: { items: batch.map((uri) => ({ uri })) },
    });
  }
  return snapshot;
}

export const reorderPlaylistItem = (
  id: string,
  rangeStart: number,
  insertBefore: number,
  snapshotId?: string,
) =>
  spotify<SnapshotResponse>(`/playlists/${id}/items`, {
    method: 'PUT',
    body: {
      range_start: rangeStart,
      insert_before: insertBefore,
      range_length: 1,
      ...(snapshotId && { snapshot_id: snapshotId }),
    },
  });

/** Replaces the whole playlist (first 100 via PUT, the rest appended). */
export async function replacePlaylistItems(id: string, uris: string[]) {
  const [first = [], ...rest] = chunk(uris, PLAYLIST_BATCH);
  let snapshot = await spotify<SnapshotResponse>(`/playlists/${id}/items`, {
    method: 'PUT',
    body: { uris: first },
  });
  for (const batch of rest) {
    snapshot = await addPlaylistItems(id, batch);
  }
  return snapshot;
}

// --- Player -----------------------------------------------------------------

export const getPlaybackState = (signal?: AbortSignal) =>
  // 204 (nothing playing) resolves to undefined.
  spotify<PlaybackState | undefined>('/me/player', {
    query: { additional_types: 'episode', market },
    signal,
  });

export const getDevices = () =>
  spotify<{ devices: Device[] }>('/me/player/devices').then((r) => r.devices);

export const transferPlayback = (deviceId: string, play: boolean) =>
  spotify<void>('/me/player', {
    method: 'PUT',
    body: { device_ids: [deviceId], play },
  });

export interface PlayOptions {
  deviceId?: string;
  contextUri?: string;
  offsetUri?: string;
  uris?: string[];
  positionMs?: number;
}

export const startPlayback = ({
  deviceId,
  contextUri,
  offsetUri,
  uris,
  positionMs,
}: PlayOptions) =>
  spotify<void>('/me/player/play', {
    method: 'PUT',
    query: { device_id: deviceId },
    body: {
      ...(contextUri && { context_uri: contextUri }),
      ...(offsetUri && { offset: { uri: offsetUri } }),
      ...(uris && { uris }),
      ...(positionMs !== undefined && {
        position_ms: Math.max(0, Math.round(positionMs)),
      }),
    },
  });

export const pausePlayback = (deviceId?: string) =>
  spotify<void>('/me/player/pause', {
    method: 'PUT',
    query: { device_id: deviceId },
  });

export const seekPlayback = (positionMs: number, deviceId?: string) =>
  spotify<void>('/me/player/seek', {
    method: 'PUT',
    query: {
      position_ms: Math.max(0, Math.round(positionMs)),
      device_id: deviceId,
    },
  });

export const skipToNext = (deviceId?: string) =>
  spotify<void>('/me/player/next', {
    method: 'POST',
    query: { device_id: deviceId },
  });
