import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_POSITIONS = 50;

export interface SavedPosition {
  ms: number;
  /** When it was saved (ms since epoch). */
  at: number;
}

interface PositionsState {
  /**
   * Where episodes were left, by uri. Spotify saves resume points with a
   * delay and cached episodes go stale: this is what the app saw last.
   */
  positions: Record<string, SavedPosition>;
  remember: (uri: string, ms: number) => void;
  forget: (uri: string) => void;
}

export const usePositions = create<PositionsState>()(
  persist(
    (set) => ({
      positions: {},
      remember: (uri, ms) =>
        set((s) => {
          const entries = Object.entries({
            ...s.positions,
            [uri]: { ms: Math.max(0, Math.round(ms)), at: Date.now() },
          });
          // Keep the most recent ones.
          entries.sort(([, a], [, b]) => b.at - a.at);
          return {
            positions: Object.fromEntries(entries.slice(0, MAX_POSITIONS)),
          };
        }),
      forget: (uri) =>
        set((s) => {
          if (!(uri in s.positions)) return s;
          const { [uri]: _forgotten, ...positions } = s.positions;
          return { positions };
        }),
    }),
    { name: 'spoticast.positions', version: 1 },
  ),
);
