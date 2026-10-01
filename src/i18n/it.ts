import type { Dictionary } from './en';

export const it: Dictionary = {
  appName: 'Sposticast',
  nav: {
    podcasts: 'Podcast',
    filters: 'Filtri',
    queue: 'In coda',
    search: 'Cerca',
    settings: 'Impostazioni',
  },
  auth: {
    tagline: 'I tuoi podcast Spotify, alla Pocket Casts.',
    login: 'Accedi con Spotify',
    premiumNote:
      "La riproduzione nell'app richiede Spotify Premium. Finché l'app è in Development Mode su Spotify, possono accedere solo gli utenti autorizzati.",
    missingClientId:
      'VITE_SPOTIFY_CLIENT_ID non è impostato. Copia .env.example in .env e compilalo.',
    callbackWorking: 'Accesso in corso…',
    callbackError: 'Accesso non riuscito: {{message}}',
    backToLogin: "Torna all'accesso",
  },
  settings: {
    title: 'Impostazioni',
    appearance: 'Aspetto',
    theme: 'Tema',
    themeDark: 'Scuro',
    themeLight: 'Chiaro',
    themeAuto: 'Sistema',
    language: 'Lingua',
    languageAuto: 'Lingua del browser',
    playback: 'Riproduzione',
    skipBack: 'Salta indietro',
    skipForward: 'Salta avanti',
    seconds: '{{count}} s',
    account: 'Account',
    logout: 'Esci',
  },
  placeholder: {
    comingSoon: 'In arrivo',
  },
};
