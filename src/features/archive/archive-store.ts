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
  attempts: number;
}

interface ArchiveState {
  /** Archived here, not yet completed on Spotify. */
  pending: Record<string, PendingArchive>;
  /** Completed on Spotify but restored by the user (local override). */
  restored: Record<string, true>;
  archive: (episode: SimplifiedEpisode) => void;
  restore: (episode: SimplifiedEpisode) => void;
  markSynced: (id: string) => void;
  markAttempt: (id: string) => void;
  retryFailed: () => void;
}

export const useArchiveStore = create<ArchiveState>()(
  persist(
    (set) => ({
      pending: {},
      restored: {},
      archive: (episode) =>
        set((s) => {
          const restored = { ...s.restored };
          delete restored[episode.id];
          // Already completed on Spotify: nothing to sync.
          if (episode.resume_point?.fully_played) return { restored };
          return {
            restored,
            pending: {
              ...s.pending,
              [episode.id]: {
                id: episode.id,
                uri: episode.uri,
                name: episode.name,
                durationMs: episode.duration_ms,
                archivedAt: Date.now(),
                attempts: 0,
              },
            },
          };
        }),
      restore: (episode) =>
        set((s) => {
          const pending = { ...s.pending };
          delete pending[episode.id];
          return episode.resume_point?.fully_played
            ? { pending, restored: { ...s.restored, [episode.id]: true } }
            : { pending };
        }),
      markSynced: (id) =>
        set((s) => {
          const pending = { ...s.pending };
          delete pending[id];
          return { pending };
        }),
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
    }),
    { name: 'spoticast.archive', version: 1 },
  ),
);

useAuth.subscribe((state, prev) => {
  if (prev.tokens && !state.tokens)
    useArchiveStore.setState({ pending: {}, restored: {} });
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
