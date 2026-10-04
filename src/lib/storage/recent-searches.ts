import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_RECENT = 8;

interface RecentSearchesState {
  recent: string[];
  add: (query: string) => void;
  clear: () => void;
}

export const useRecentSearches = create<RecentSearchesState>()(
  persist(
    (set) => ({
      recent: [],
      add: (query) => {
        const q = query.trim();
        if (!q) return;
        set((s) => ({
          recent: [
            q,
            ...s.recent.filter((r) => r.toLowerCase() !== q.toLowerCase()),
          ].slice(0, MAX_RECENT),
        }));
      },
      clear: () => set({ recent: [] }),
    }),
    { name: 'spoticast.recent-searches', version: 1 },
  ),
);
