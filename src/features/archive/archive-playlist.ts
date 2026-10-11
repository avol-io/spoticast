import i18n from '../../i18n';
import { getAccessToken, useAuth } from '../../lib/spotify/auth';
import { SpotifyApiError } from '../../lib/spotify/client';
import {
  addPlaylistItems,
  createPlaylist,
  getMe,
  getMyPlaylists,
  getPlaylistItems,
  libraryContains,
  removePlaylistItems,
  saveToLibrary,
} from '../../lib/spotify/endpoints';
import type { Episode } from '../../lib/spotify/types';
import { useArchiveStore, type RemoteArchive } from './archive-store';

/**
 * The archive is shared through a private playlist: every device sees what
 * was archived anywhere, and any idle device can complete it on Spotify.
 * Found by this marker in its description, whatever its name.
 */
export const ARCHIVE_DESCRIPTION = 'Spoticast archive · sca1';
const MARKER = 'sca1';
/** How long a fresh write may take to show up in reads of the playlist. */
const SETTLE_MS = 60_000;

let ensuring: Promise<string> | null = null;

/** Finds or creates the archive playlist (once per session). */
export function ensureArchivePlaylist(): Promise<string> {
  ensuring ??= (async () => {
    const { playlistId, setPlaylistId } = useArchiveStore.getState();
    if (playlistId) {
      const uri = `spotify:playlist:${playlistId}`;
      try {
        // A "deleted" playlist is only unfollowed: follow it again.
        const [followed] = await libraryContains([uri]);
        if (!followed) await saveToLibrary([uri]);
        return playlistId;
      } catch (error) {
        if (!(error instanceof SpotifyApiError && error.status === 404))
          throw error;
      }
    }
    const me = await getMe();
    const existing = (await getMyPlaylists()).find(
      (p) => p.owner.id === me.id && p.description?.includes(MARKER),
    );
    const id =
      existing?.id ??
      (
        await createPlaylist(
          i18n.t('archive.playlistName'),
          ARCHIVE_DESCRIPTION,
        )
      ).id;
    setPlaylistId(id);
    return id;
  })().catch((error) => {
    ensuring = null;
    throw error;
  });
  return ensuring;
}

/** Test hook: forget the memoized playlist lookup. */
export function resetArchivePlaylistCache() {
  ensuring = null;
}

// Writes and reads must not interleave: run them one at a time.
let chain: Promise<unknown> = Promise.resolve();

function serial<T>(operation: () => Promise<T>): Promise<T> {
  const run = chain.then(operation, operation);
  chain = run.catch(() => undefined);
  return run;
}

/** Writes what this device archived or took out of the archive. */
async function flushNow(): Promise<void> {
  const { pending, removed, markShared, clearRemoved } =
    useArchiveStore.getState();
  const removals = Object.entries(removed);
  const additions = Object.values(pending).filter((p) => p.sharedAt === null);
  if (!removals.length && !additions.length) return;
  const id = await ensureArchivePlaylist();
  // Removals first: an episode archived again gets written back after.
  if (removals.length) {
    await removePlaylistItems(
      id,
      removals.map(([, uri]) => uri),
    );
    clearRemoved(removals.map(([episodeId]) => episodeId));
  }
  if (additions.length) {
    await addPlaylistItems(
      id,
      additions.map((p) => p.uri),
    );
    markShared(additions.map((p) => p.id));
  }
}

export const flushArchive = () => serial(flushNow);

const toRemote = (episode: Episode, addedAt: string | null): RemoteArchive => ({
  id: episode.id,
  uri: episode.uri,
  name: episode.name,
  durationMs: episode.duration_ms,
  archivedAt: addedAt ? Date.parse(addedAt) : Date.now(),
  done: !!episode.resume_point?.fully_played,
});

/**
 * Writes the local changes, then reads the playlist back to pick up what
 * other devices archived, completed or restored.
 */
export function syncArchive(): Promise<void> {
  return serial(async () => {
    await flushNow();
    const since = Date.now() - SETTLE_MS;
    const items = await getPlaylistItems(await ensureArchivePlaylist());
    useArchiveStore.getState().applyRemote(
      items.flatMap((entry) =>
        entry.item?.type === 'episode'
          ? [toRemote(entry.item, entry.added_at)]
          : [],
      ),
      since,
    );
    // Episodes Spotify already completed leave the playlist now.
    await flushNow();
  });
}

let flushTimer: ReturnType<typeof setTimeout> | undefined;

// Archive, restore and completion all change the store: write them shortly
// after (batching bulk actions). Offline, the next foreground sync retries.
useArchiveStore.subscribe((state, prev) => {
  if (state.pending === prev.pending && state.removed === prev.removed) return;
  if (!useAuth.getState().tokens) return;
  clearTimeout(flushTimer);
  flushTimer = setTimeout(
    () =>
      void getAccessToken()
        .then(flushArchive)
        .catch(() => undefined),
    500,
  );
});

useAuth.subscribe((state, prev) => {
  if (prev.tokens && !state.tokens) {
    clearTimeout(flushTimer);
    ensuring = null;
  }
});
