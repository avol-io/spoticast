import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuth } from '../../lib/spotify/auth';
import type { SimplifiedEpisode } from '../../lib/spotify/types';

/** Max automatic attempts before asking the user to retry. */
export const MAX_ARCHIVE_ATTEMPTS = 3;

export interface PendingArchive {
  id: string;
  uri: string;
  name: string;
  durationMs: number;
  archivedAt: number;
  /** Attempts made on this device. */
  attempts: number;
  /** When it was written to the archive playlist; null: not yet. */
  sharedAt: number | null;
}

/** An episode found in the archive playlist on Spotify. */
export interface RemoteArchive {
  id: string;
  uri: string;
  name: string;
  durationMs: number;
  archivedAt: number;
  /** Spotify already counts it as completed. */
  done: boolean;
}

interface ArchiveState {
  /**
   * Archived, not yet completed on Spotify: a copy of the archive playlist
   * shared by every device, plus what this device didn't write there yet.
   */
  pending: Record<string, PendingArchive>;
  /** Left the archive here, still to be removed from the playlist (uri by id). */
  removed: Record<string, string>;
  /** Completed on Spotify but restored by the user (local override). */
  restored: Record<string, true>;
  /** The archive playlist on Spotify. */
  playlistId: string | null;
  archive: (episode: SimplifiedEpisode) => void;
  restore: (episode: SimplifiedEpisode) => void;
  markSynced: (id: string) => void;
  markAttempt: (id: string) => void;
  retryFailed: () => void;
  setPlaylistId: (playlistId: string | null) => void;
  /** These additions reached the playlist. */
  markShared: (ids: string[]) => void;
  /** These removals reached the playlist. */
  clearRemoved: (ids: string[]) => void;
  /**
   * Aligns with the playlist read at `since`: adds what other devices
   * archived and drops what left it (completed or restored elsewhere).
   */
  applyRemote: (items: RemoteArchive[], since: number) => void;
}

/** Takes an episode out of `pending`, to be removed from the playlist too. */
function leave(
  s: Pick<ArchiveState, 'pending' | 'removed'>,
  id: string,
): Pick<ArchiveState, 'pending' | 'removed'> {
  const entry = s.pending[id];
  if (!entry) return s;
  const pending = { ...s.pending };
  delete pending[id];
  return {
    pending,
    removed:
      entry.sharedAt !== null ? { ...s.removed, [id]: entry.uri } : s.removed,
  };
}

export const useArchiveStore = create<ArchiveState>()(
  persist(
    (set) => ({
      pending: {},
      removed: {},
      restored: {},
      playlistId: null,
      archive: (episode) =>
        set((s) => {
          const restored = { ...s.restored };
          delete restored[episode.id];
          // Already completed on Spotify: nothing to sync.
          if (episode.resume_point?.fully_played) return { restored };
          if (s.pending[episode.id]) return { restored };
          // A removal may still be on its way: write it again (duplicates
          // in the playlist are harmless).
          const removed = { ...s.removed };
          delete removed[episode.id];
          return {
            restored,
            removed,
            pending: {
              ...s.pending,
              [episode.id]: {
                id: episode.id,
                uri: episode.uri,
                name: episode.name,
                durationMs: episode.duration_ms,
                archivedAt: Date.now(),
                attempts: 0,
                sharedAt: null,
              },
            },
          };
        }),
      restore: (episode) =>
        set((s) => ({
          ...leave(s, episode.id),
          ...(episode.resume_point?.fully_played && {
            restored: { ...s.restored, [episode.id]: true },
          }),
        })),
      markSynced: (id) => set((s) => leave(s, id)),
      markAttempt: (id) =>
        set((s) =>
          s.pending[id]
            ? {
                pending: {
                  ...s.pending,
                  [id]: {
                    ...s.pending[id],
                    attempts: s.pending[id].attempts + 1,
                  },
                },
              }
            : s,
        ),
      retryFailed: () =>
        set((s) => ({
          pending: Object.fromEntries(
            Object.entries(s.pending).map(([id, p]) => [
              id,
              { ...p, attempts: 0 },
            ]),
          ),
        })),
      setPlaylistId: (playlistId) => set({ playlistId }),
      markShared: (ids) =>
        set((s) => {
          const pending = { ...s.pending };
          const now = Date.now();
          for (const id of ids)
            if (pending[id]) pending[id] = { ...pending[id], sharedAt: now };
          return { pending };
        }),
      clearRemoved: (ids) =>
        set((s) => {
          const removed = { ...s.removed };
          for (const id of ids) delete removed[id];
          return { removed };
        }),
      applyRemote: (items, since) =>
        set((s) => {
          const pending = { ...s.pending };
          const removed = { ...s.removed };
          const listed = new Set(items.map((item) => item.id));
          // Written well before the read and gone from the playlist: done
          // or restored elsewhere. Fresh writes may not show up yet.
          for (const entry of Object.values(pending))
            if (
              entry.sharedAt !== null &&
              entry.sharedAt < since &&
              !listed.has(entry.id)
            )
              delete pending[entry.id];
          for (const item of items) {
            if (removed[item.id]) continue;
            if (item.done) {
              delete pending[item.id];
              removed[item.id] = item.uri;
            } else if (!pending[item.id]) {
              const { done: _done, ...entry } = item;
              pending[item.id] = {
                ...entry,
                attempts: 0,
                sharedAt: item.archivedAt,
              };
            } else if (pending[item.id].sharedAt === null) {
              // Already there (written by a flush whose answer got lost).
              pending[item.id] = { ...pending[item.id], sharedAt: Date.now() };
            }
          }
          return { pending, removed };
        }),
    }),
    {
      name: 'spoticast.archive',
      version: 2,
      // v1 kept the archive on this device only: share it.
      migrate: (persisted, version) => {
        const state = persisted as Partial<ArchiveState>;
        if (version < 2)
          state.pending = Object.fromEntries(
            Object.entries(state.pending ?? {}).map(([id, entry]) => [
              id,
              { ...entry, sharedAt: null },
            ]),
          );
        return state as ArchiveState;
      },
    },
  ),
);

useAuth.subscribe((state, prev) => {
  if (prev.tokens && !state.tokens)
    useArchiveStore.setState({
      pending: {},
      removed: {},
      restored: {},
      playlistId: null,
    });
});

export type ArchiveStatus = 'played' | 'pending' | 'restored' | null;

/** Archived = completed on Spotify or archived here, unless restored. */
export function archiveStatus(
  episode: SimplifiedEpisode,
  state: Pick<ArchiveState, 'pending' | 'restored'>,
): ArchiveStatus {
  if (state.pending[episode.id]) return 'pending';
  if (episode.resume_point?.fully_played)
    return state.restored[episode.id] ? 'restored' : 'played';
  return null;
}

export const isArchivedIn = (
  episode: SimplifiedEpisode,
  state: Pick<ArchiveState, 'pending' | 'restored'>,
) => {
  const status = archiveStatus(episode, state);
  return status === 'played' || status === 'pending';
};
