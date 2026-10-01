import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { del, get, set } from 'idb-keyval';
import { useAuth } from '../spotify/auth';
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
