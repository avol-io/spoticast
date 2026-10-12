/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/vanillajs" />

interface ImportMetaEnv {
  readonly VITE_SPOTIFY_CLIENT_ID?: string;
  readonly VITE_BASE?: string;
  readonly VITE_CHANNEL?: 'production' | 'beta';
  /** Seconds of diagnostics log sent with feedback (beta, dev). */
  readonly VITE_DIAG_WINDOW_SECONDS?: string;
  /** Longest feedback email body, in characters. */
  readonly VITE_DIAG_MAX_CHARS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Injected by vite.config.mts (BuildInfo); also served as version.json. */
declare const __APP_BUILD__: {
  version: string;
  sha: string;
  date: string;
  channel: 'production' | 'beta';
  releaseUrl?: string;
};
