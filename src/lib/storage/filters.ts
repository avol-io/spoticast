import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuth } from '../spotify/auth';
import type { EpisodeSort, FilterCriteria } from '../filters/engine';

export interface FilterPreset {
  id: string;
  name: string;
  criteria: FilterCriteria;
}

/** Pocket Casts style filter across podcasts. */
export interface SmartList {
  id: string;
  name: string;
  criteria: FilterCriteria;
  /** null = every followed podcast. */
  showIds: string[] | null;
  includeArchived: boolean;
  sort: EpisodeSort;
  /** Mirror into a "Spoticast - <name>" playlist rebuilt on startup. */
  spotifyPlaylist: boolean;
  playlistId: string | null;
  /** Name the playlist currently has on Spotify (to detect renames). */
  playlistName: string | null;
}

interface FiltersState {
  /** Active filter of each podcast detail, by show id. */
  podcast: Record<string, FilterCriteria>;
  presets: FilterPreset[];
  smartLists: SmartList[];
  setPodcastFilter: (showId: string, criteria: FilterCriteria | null) => void;
  savePreset: (name: string, criteria: FilterCriteria) => FilterPreset;
  deletePreset: (id: string) => void;
  saveSmartList: (list: SmartList) => void;
  deleteSmartList: (id: string) => void;
  setSmartPlaylist: (
    listId: string,
    playlistId: string | null,
    playlistName: string | null,
  ) => void;
}

const newId = () => crypto.randomUUID().slice(0, 8);

export const useFilters = create<FiltersState>()(
  persist(
    (set) => ({
      podcast: {},
      presets: [],
      smartLists: [],
      setPodcastFilter: (showId, criteria) =>
        set((s) => {
          const podcast = { ...s.podcast };
          if (criteria) podcast[showId] = criteria;
          else delete podcast[showId];
          return { podcast };
        }),
      savePreset: (name, criteria) => {
        const preset = { id: newId(), name, criteria };
        set((s) => ({ presets: [...s.presets, preset] }));
        return preset;
      },
      deletePreset: (id) =>
        set((s) => ({ presets: s.presets.filter((p) => p.id !== id) })),
      saveSmartList: (list) =>
        set((s) => ({
          smartLists: s.smartLists.some((l) => l.id === list.id)
            ? s.smartLists.map((l) => (l.id === list.id ? list : l))
            : [...s.smartLists, list],
        })),
      deleteSmartList: (id) =>
        set((s) => ({ smartLists: s.smartLists.filter((l) => l.id !== id) })),
      setSmartPlaylist: (listId, playlistId, playlistName) =>
        set((s) => ({
          smartLists: s.smartLists.map((l) =>
            l.id === listId ? { ...l, playlistId, playlistName } : l,
          ),
        })),
    }),
    { name: 'spoticast.filters', version: 1 },
  ),
);

export function newSmartListId() {
  return newId();
}

useAuth.subscribe((state, prev) => {
  // Playlist ids belong to the previous account.
  if (prev.tokens && !state.tokens) {
    useFilters.setState((s) => ({
      smartLists: s.smartLists.map((l) => ({
        ...l,
        playlistId: null,
        playlistName: null,
      })),
    }));
  }
});
