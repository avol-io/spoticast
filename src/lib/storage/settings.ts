import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language } from '../../i18n';

export type ThemePreference = 'dark' | 'light' | 'auto';

export interface SettingsState {
  theme: ThemePreference;
  language: Language | 'auto';
  skipBackSeconds: number;
  skipForwardSeconds: number;
  /** ISO country code for the charts; null = derive from the browser. */
  chartsMarket: string | null;
  setTheme: (theme: ThemePreference) => void;
  setLanguage: (language: Language | 'auto') => void;
  setSkip: (back: number, forward: number) => void;
  setChartsMarket: (market: string | null) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      language: 'auto',
      skipBackSeconds: 10,
      skipForwardSeconds: 30,
      chartsMarket: null,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setSkip: (skipBackSeconds, skipForwardSeconds) =>
        set({ skipBackSeconds, skipForwardSeconds }),
      setChartsMarket: (chartsMarket) => set({ chartsMarket }),
    }),
    { name: 'sposticast.settings', version: 1 },
  ),
);
