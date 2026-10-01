const SDK_URL = 'https://sdk.scdn.co/spotify-player.js';

let loading: Promise<void> | null = null;

/** Loads the Spotify Web Playback SDK script once. */
export function loadPlaybackSdk(): Promise<void> {
  loading ??= new Promise<void>((resolve, reject) => {
    if (window.Spotify) {
      resolve();
      return;
    }
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onerror = () => {
      loading = null;
      reject(new Error('Unable to load the Spotify player'));
    };
    document.body.appendChild(script);
  });
  return loading;
}
