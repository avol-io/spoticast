import { useEffect } from 'react';
import { create } from 'zustand';
import type { Episode } from '../../lib/spotify/types';
import type { ManualPlaylist } from '../filters/manual-playlists';

/** Which bulk actions a list offers: Up Next and manual playlists can also remove. */
export type SelectionKind = 'episodes' | 'queue' | { playlist: ManualPlaylist };

interface SelectionState {
  /** The list in selection mode; null when not selecting. */
  scope: string | null;
  kind: SelectionKind;
  /** Episodes of the registered list, in display order. */
  episodes: Episode[];
  selected: string[];
  register: (scope: string, kind: SelectionKind, episodes: Episode[]) => void;
  unregister: (scope: string) => void;
  start: (scope: string, uri?: string) => void;
  toggle: (uri: string) => void;
  selectAll: () => void;
  clear: () => void;
}

export const useSelection = create<SelectionState>()((set, get) => ({
  scope: null,
  kind: 'episodes',
  episodes: [],
  selected: [],
  register: (scope, kind, episodes) => {
    const s = get();
    if (s.scope !== null && s.scope !== scope) return;
    const uris = new Set(episodes.map((ep) => ep.uri));
    // Episodes that left the list can't stay selected.
    const selected = s.selected.filter((uri) => uris.has(uri));
    set({
      kind,
      episodes,
      ...(selected.length !== s.selected.length && { selected }),
    });
  },
  unregister: (scope) => {
    if (get().scope === scope) set({ scope: null, selected: [] });
  },
  start: (scope, uri) => set({ scope, selected: uri ? [uri] : [] }),
  toggle: (uri) =>
    set((s) => ({
      selected: s.selected.includes(uri)
        ? s.selected.filter((u) => u !== uri)
        : [...s.selected, uri],
    })),
  selectAll: () => set((s) => ({ selected: s.episodes.map((ep) => ep.uri) })),
  clear: () => set({ scope: null, selected: [] }),
}));

/**
 * Makes a list selectable: keeps its episodes available to the selection
 * bar and leaves selection mode when the list goes away.
 */
export function useSelectableList(
  scope: string,
  kind: SelectionKind,
  episodes: Episode[],
) {
  const register = useSelection((s) => s.register);
  const unregister = useSelection((s) => s.unregister);
  const active = useSelection((s) => s.scope === scope);
  useEffect(() => {
    if (active) register(scope, kind, episodes);
  }, [active, register, scope, kind, episodes]);
  useEffect(() => () => unregister(scope), [unregister, scope]);
  return {
    selecting: active,
    start: (uri?: string) => {
      useSelection.getState().start(scope, uri);
      register(scope, kind, episodes);
    },
  };
}
