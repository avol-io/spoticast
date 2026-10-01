import type { ReactNode } from 'react';
import { useAuth } from '../../lib/spotify/auth';
import LoginPage from './login-page';

/** Renders the login screen in place of its children until logged in. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const loggedIn = useAuth((s) => s.tokens !== null);
  return loggedIn ? children : <LoginPage />;
}

export default RequireAuth;
