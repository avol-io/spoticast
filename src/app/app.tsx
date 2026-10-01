import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { persistOptions, queryClient } from '../lib/query/query-client';
import { useApplyPreferences } from './hooks/use-apply-preferences';
import { createAppRouter } from './router';

export function App() {
  useApplyPreferences();
  const [router] = useState(createAppRouter);
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
    >
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </PersistQueryClientProvider>
  );
}

export default App;
