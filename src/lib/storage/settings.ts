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
  /** Shows raw Spotify data next to what the app makes of it. */
  debugMode: boolean;
  /** This device's name in Spotify Connect; empty = the kind of device. */
  deviceName: string;
  setTheme: (theme: ThemePreference) => void;
  setLanguage: (language: Language | 'auto') => void;
  setSkip: (back: number, forward: number) => void;
  setChartsMarket: (market: string | null) => void;
  setPreferredDevice: (device: PreferredDevice | null) => void;
  setDebugMode: (debugMode: boolean) => void;
  setDeviceName: (deviceName: string) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'auto',
      language: 'auto',
      skipBackSeconds: 10,
      skipForwardSeconds: 30,
      chartsMarket: null,
      preferredDevice: null,
      debugMode: false,
      deviceName: '',
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setSkip: (skipBackSeconds, skipForwardSeconds) =>
        set({ skipBackSeconds, skipForwardSeconds }),
      setChartsMarket: (chartsMarket) => set({ chartsMarket }),
      setPreferredDevice: (preferredDevice) => set({ preferredDevice }),
      setDebugMode: (debugMode) => set({ debugMode }),
      setDeviceName: (deviceName) => set({ deviceName }),
    }),
    { name: 'spoticast.settings', version: 1 },
  ),
);
