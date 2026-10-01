// Subset of the Spotify Web API objects used by Spoticast.
// https://developer.spotify.com/documentation/web-api/reference

export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface ExternalUrls {
  spotify: string;
}

export interface Paging<T> {
  href: string;
  items: T[];
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
}

export interface ResumePoint {
  fully_played: boolean;
  resume_position_ms: number;
}

export interface SimplifiedEpisode {
  id: string;
  uri: string;
  type: 'episode';
  name: string;
  description: string;
  html_description: string;
  duration_ms: number;
  explicit: boolean;
  images: SpotifyImage[];
  is_playable?: boolean;
  is_externally_hosted?: boolean;
  release_date: string;
  release_date_precision: 'year' | 'month' | 'day';
  /** Only present with the user-read-playback-position scope. */
  resume_point?: ResumePoint;
  external_urls: ExternalUrls;
}

/** "audio" for audio-only shows; other values indicate video episodes. */
export type ShowMediaType = 'audio' | 'video' | 'mixed' | string;

export interface SimplifiedShow {
  id: string;
  uri: string;
  type: 'show';
  name: string;
  description: string;
  html_description: string;
  explicit: boolean;
  images: SpotifyImage[];
  media_type: ShowMediaType;
  total_episodes: number;
  languages: string[];
  external_urls: ExternalUrls;
}

export interface Show extends SimplifiedShow {
  episodes: Paging<SimplifiedEpisode>;
}

export interface Episode extends SimplifiedEpisode {
  show: SimplifiedShow;
}

export interface SavedShow {
  added_at: string;
  show: SimplifiedShow;
}

export interface SavedEpisode {
  added_at: string;
  episode: Episode;
}

export interface User {
  id: string;
  display_name: string | null;
  images: SpotifyImage[];
  uri: string;
}

export interface SimplifiedPlaylist {
  id: string;
  uri: string;
  name: string;
  description: string | null;
  public: boolean | null;
  collaborative: boolean;
  snapshot_id: string;
  owner: { id: string; display_name: string | null };
  images: SpotifyImage[] | null;
  external_urls: ExternalUrls;
}

export interface PlaylistItem {
  added_at: string | null;
  is_local: boolean;
  /** Tracks can end up in the playlist from other clients; we ignore them. */
  item:
    | Episode
    | { type: 'track'; id: string; uri: string; name: string }
    | null;
}

export interface SnapshotResponse {
  snapshot_id: string;
}

export type DeviceType =
  | 'Computer'
  | 'Smartphone'
  | 'Tablet'
  | 'Speaker'
  | 'TV'
  | 'AVR'
  | 'STB'
  | 'AudioDongle'
  | 'GameConsole'
  | 'CastVideo'
  | 'CastAudio'
  | 'Automobile'
  | string;

export interface Device {
  id: string | null;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: DeviceType;
  volume_percent: number | null;
  supports_volume: boolean;
}

export interface PlaybackState {
  device: Device;
  repeat_state: 'off' | 'track' | 'context';
  shuffle_state: boolean;
  context: { type: string; uri: string } | null;
  timestamp: number;
  progress_ms: number | null;
  is_playing: boolean;
  currently_playing_type: 'track' | 'episode' | 'ad' | 'unknown';
  item:
    | Episode
    | {
        type: 'track';
        id: string;
        uri: string;
        name: string;
        duration_ms: number;
      }
    | null;
}

export interface SearchResults {
  shows?: Paging<SimplifiedShow | null>;
  episodes?: Paging<SimplifiedEpisode | null>;
}
