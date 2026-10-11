import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, QueryClient } from '@tanstack/react-query';
import { del, get, set } from 'idb-keyval';
import { onForeground } from '../pwa/foreground';
import { getAccessToken, useAuth } from '../spotify/auth';
import { SpotifyApiError } from '../spotify/client';

const DAY = 24 * 60 * 60 * 1000;

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        // Keep data around long enough to be persisted and used offline.
        gcTime: 7 * DAY,
        refetchOnWindowFocus: true,
        retry: (count, error) =>
          count < 2 &&
          !(
            error instanceof SpotifyApiError &&
            error.status < 500 &&
            error.status !== 429
          ),
      },
    },
  });
}

export const queryClient = createQueryClient();

// Refetch on return only once the token is fresh, instead of firing every
// query at once while the network and the token are still waking up.
focusManager.setEventListener((handleFocus) => {
  const onHide = () => document.hidden && handleFocus(false);
  document.addEventListener('visibilitychange', onHide);
  const stop = onForeground(() => {
    void getAccessToken()
      .catch(() => undefined)
      .then(() => handleFocus(true));
  });
  return () => {
    document.removeEventListener('visibilitychange', onHide);
    stop();
  };
});

/** Persists the query cache in IndexedDB so the app opens instantly/offline. */
export const persister = createAsyncStoragePersister({
  key: 'spoticast.query-cache',
  storage: {
    getItem: (key) => get<string>(key).then((v) => v ?? null),
    setItem: (key, value: string) => set(key, value),
    removeItem: (key) => del(key),
  },
  throttleTime: 2000,
});

export const persistOptions = {
  persister,
  maxAge: 7 * DAY,
  // Bump when cached data shapes change.
  buster: 'v1',
};

// Never show one account's cached library to the next user.
useAuth.subscribe((state, prev) => {
  if (prev.tokens && !state.tokens) {
    queryClient.clear();
    void persister.removeClient();
  }
});
