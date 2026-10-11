import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language } from '../../i18n';
import type { DeviceType } from '../spotify/types';

export type ThemePreference = 'dark' | 'light' | 'auto';

/**
 * Where to play when nothing is playing. This browser is a marker, since the
 * SDK gets a new device id every session; other devices are matched by id,
 * then by name.
 */
export type PreferredDevice =
  | { kind: 'local' }
  | { kind: 'remote'; id: string; name: string; type: DeviceType };

export interface SettingsState {
  theme: ThemePreference;
  language: Language | 'auto';
  skipBackSeconds: number;
  skipForwardSeconds: number;
  /** ISO country code for the charts; null = derive from the browser. */
  chartsMarket: string | null;
  preferredDevice: PreferredDevice | null;
  setTheme: (theme: ThemePreference) => void;
  setLanguage: (language: Language | 'auto') => void;
  setSkip: (back: number, forward: number) => void;
  setChartsMarket: (market: string | null) => void;
  setPreferredDevice: (device: PreferredDevice | null) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      language: 'auto',
      skipBackSeconds: 10,
      skipForwardSeconds: 30,
      chartsMarket: null,
      preferredDevice: null,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setSkip: (skipBackSeconds, skipForwardSeconds) =>
        set({ skipBackSeconds, skipForwardSeconds }),
      setChartsMarket: (chartsMarket) => set({ chartsMarket }),
      setPreferredDevice: (preferredDevice) => set({ preferredDevice }),
    }),
    { name: 'spoticast.settings', version: 1 },
  ),
);
