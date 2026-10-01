import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuth } from '../../lib/spotify/auth';

export const QUEUE_PLAYLIST_NAME = 'Spoticast';

interface QueueStoreState {
  /** The user's "Spoticast" playlist backing Up Next. */
  playlistId: string | null;
  userId: string | null;
  setPlaylist: (playlistId: string | null, userId: string | null) => void;
}

export const useQueueStore = create<QueueStoreState>()(
  persist(
    (set) => ({
      playlistId: null,
      userId: null,
      setPlaylist: (playlistId, userId) => set({ playlistId, userId }),
    }),
    { name: 'spoticast.queue', version: 1 },
  ),
);

useAuth.subscribe((state, prev) => {
  if (prev.tokens && !state.tokens)
    useQueueStore.getState().setPlaylist(null, null);
});
