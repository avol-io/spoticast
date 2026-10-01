export const en = {
  appName: 'Spoticast',
  nav: {
    podcasts: 'Podcasts',
    filters: 'Filters',
    queue: 'Up Next',
    search: 'Search',
    settings: 'Settings',
  },
  auth: {
    tagline: 'Your Spotify podcasts, the Pocket Casts way.',
    login: 'Log in with Spotify',
    premiumNote:
      'Playback inside the app requires Spotify Premium. While the app is in Spotify Development Mode, only users added to its allow-list can log in.',
    missingClientId:
      'VITE_SPOTIFY_CLIENT_ID is not set. Copy .env.example to .env and fill it in.',
    redirectUriHint: 'Redirect URI to register in the Spotify Dashboard:',
    callbackWorking: 'Logging you in…',
    callbackError: 'Login failed: {{message}}',
    backToLogin: 'Back to login',
  },
  settings: {
    title: 'Settings',
    appearance: 'Appearance',
    theme: 'Theme',
    themeDark: 'Dark',
    themeLight: 'Light',
    themeAuto: 'System',
    language: 'Language',
    languageAuto: 'Browser default',
    playback: 'Playback',
    skipBack: 'Skip back',
    skipForward: 'Skip forward',
    seconds: '{{count}} s',
    account: 'Account',
    logout: 'Log out',
  },
  placeholder: {
    comingSoon: 'Coming soon',
  },
} as const;

type Widen<T> = {
  -readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]>;
};
export type Dictionary = Widen<typeof en>;
