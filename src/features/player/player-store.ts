import { create } from 'zustand';
import type { NowPlaying } from './playback';

export type SdkStatus = 'idle' | 'loading' | 'ready' | 'unavailable' | 'error';

export interface VideoRequest {
  uri: string;
  name: string;
  /** Seconds to start the video at. */
  startAt: number;
}

interface PlayerState {
  sdkStatus: SdkStatus;
  /** i18n key explaining why the in-browser player can't be used. */
  sdkError?: 'player.premiumRequired' | 'player.sdkError';
  sdkErrorDetail?: string;
  localDeviceId?: string;
  nowPlaying: NowPlaying | null;
  fullPlayerOpen: boolean;
  video: VideoRequest | null;
  /** An archived episode is being completed silently on this browser. */
  archiveSyncing: boolean;
  setFullPlayerOpen: (open: boolean) => void;
  setVideo: (video: VideoRequest | null) => void;
}

export const usePlayer = create<PlayerState>()((set) => ({
  sdkStatus: 'idle',
  nowPlaying: null,
  fullPlayerOpen: false,
  video: null,
  archiveSyncing: false,
  setFullPlayerOpen: (fullPlayerOpen) => set({ fullPlayerOpen }),
  setVideo: (video) => set({ video }),
}));

/** Audio is coming out of this browser: a reload would cut it off. */
export function selectPlayingHere(s: PlayerState): boolean {
  return (
    s.archiveSyncing ||
    (s.nowPlaying !== null &&
      !s.nowPlaying.paused &&
      s.nowPlaying.deviceId !== null &&
      s.nowPlaying.deviceId === s.localDeviceId)
  );
}
