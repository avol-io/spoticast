import { useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { useApplyPreferences } from './hooks/use-apply-preferences';
import { createAppRouter } from './router';

export function App() {
  useApplyPreferences();
  const [router] = useState(createAppRouter);
  return <RouterProvider router={router} />;
}

export default App;
