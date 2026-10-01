import { pickImage } from '../../lib/episodes';
import type { Device, PlaybackState } from '../../lib/spotify/types';

/** What is playing, wherever it plays (this browser or another device). */
export interface NowPlaying {
  uri: string;
  id: string;
  type: 'episode' | 'track' | 'ad' | 'unknown';
  name: string;
  showName: string;
  showId?: string;
  image?: string;
  durationMs: number;
  /** Position when the state was observed, see `updatedAt`. */
  positionMs: number;
  /** Epoch ms of the observation, used to interpolate the position. */
  updatedAt: number;
  paused: boolean;
  contextUri: string | null;
  deviceId: string | null;
  deviceName: string;
  /** True when playing in this browser through the Web Playback SDK. */
  isLocal: boolean;
  video: boolean;
}

const showIdFromUri = (uri: string | undefined) =>
  uri?.startsWith('spotify:show:')
    ? uri.slice('spotify:show:'.length)
    : undefined;

export function fromSdkState(
  state: Spotify.PlaybackState | null,
  deviceId: string,
  deviceName: string,
  now = Date.now(),
): NowPlaying | null {
  const track = state?.track_window.current_track;
  if (!state || !track) return null;
  return {
    uri: track.uri,
    id: track.id ?? track.uri.split(':').pop() ?? '',
    type: track.type,
    name: track.name,
    // For episodes the SDK reports the show as the album.
    showName: track.album.name || track.artists[0]?.name || '',
    showId: showIdFromUri(track.album.uri),
    image: pickImage(
      track.album.images.map((img) => ({
        url: img.url,
        width: img.width ?? null,
      })),
      300,
    ),
    durationMs: state.duration || track.duration_ms,
    positionMs: state.position,
    updatedAt: now,
    paused: state.paused,
    contextUri: state.context.uri,
    deviceId,
    deviceName,
    isLocal: true,
    video: track.media_type === 'video',
  };
}

export function fromApiState(
  state: PlaybackState | undefined,
  localDeviceId: string | undefined,
  now = Date.now(),
): NowPlaying | null {
  const item = state?.item;
  if (!state || !item) return null;
  const episode = item.type === 'episode' ? item : undefined;
  return {
    uri: item.uri,
    id: item.id,
    type: item.type,
    name: item.name,
    showName: episode?.show.name ?? '',
    showId: episode?.show.id,
    image: pickImage(episode?.images ?? episode?.show.images, 300),
    durationMs: item.duration_ms,
    positionMs: state.progress_ms ?? 0,
    updatedAt: now,
    paused: !state.is_playing,
    contextUri: state.context?.uri ?? null,
    deviceId: state.device.id,
    deviceName: state.device.name,
    isLocal: !!localDeviceId && state.device.id === localDeviceId,
    video: episode ? episode.show.media_type !== 'audio' : false,
  };
}

/** Position extrapolated to `now` while playing. */
export function currentPosition(np: NowPlaying, now = Date.now()): number {
  if (np.paused) return np.positionMs;
  return Math.min(np.durationMs, np.positionMs + (now - np.updatedAt));
}

/** How close to the end playback must get to count as finished. */
const END_MARGIN_MS = 30_000;

/**
 * Returns the URI of the episode that just finished, comparing two
 * consecutive observations: the previous episode reached its last seconds
 * and then either something else started or playback reset/stopped.
 */
export function finishedEpisode(
  prev: NowPlaying | null,
  next: NowPlaying | null,
): string | null {
  if (!prev || prev.type !== 'episode') return null;
  const reached = currentPosition(prev, next?.updatedAt ?? Date.now());
  if (reached < prev.durationMs - END_MARGIN_MS) return null;
  if (!next || next.uri !== prev.uri) return prev.uri;
  // Same episode, back at the start and paused: the context ended.
  if (next.paused && next.positionMs < 5_000) return prev.uri;
  return null;
}

/**
 * The device to hand playback over to for "Continue in Spotify": any device
 * but this browser, preferring a phone on touch devices and a computer
 * otherwise, then whichever is active.
 */
export function pickSpotifyAppDevice(
  devices: Device[],
  localDeviceId: string | undefined,
  preferMobile: boolean,
): Device | undefined {
  const candidates = devices.filter(
    (d) => d.id && d.id !== localDeviceId && !d.is_restricted,
  );
  const preferred = preferMobile ? ['Smartphone', 'Tablet'] : ['Computer'];
  return (
    candidates.find((d) => preferred.includes(d.type)) ??
    candidates.find((d) => d.is_active) ??
    candidates[0]
  );
}
