import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LibraryView = 'grid' | 'list';
export type LibrarySort = 'latest' | 'alpha' | 'manual';

interface LibraryPrefsState {
  view: LibraryView;
  sort: LibrarySort;
  /** Show ids in the user's drag-and-drop order. */
  manualOrder: string[];
  setView: (view: LibraryView) => void;
  setSort: (sort: LibrarySort) => void;
  setManualOrder: (ids: string[]) => void;
}

export const useLibraryPrefs = create<LibraryPrefsState>()(
  persist(
    (set) => ({
      view: 'grid',
      sort: 'latest',
      manualOrder: [],
      setView: (view) => set({ view }),
      setSort: (sort) => set({ sort }),
      setManualOrder: (manualOrder) => set({ manualOrder }),
    }),
    { name: 'spoticast.library', version: 1 },
  ),
);
