import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { useAuth } from '../../lib/spotify/auth';

import CallbackPage from './callback-page';

function renderAt(url: string) {
  const router = createMemoryRouter(
    [
      { path: '/callback', element: <CallbackPage /> },
      { path: '/podcast/1', element: <p>Back where I was</p> },
    ],
    { initialEntries: [url] },
  );
  render(<RouterProvider router={router} />);
}

describe('CallbackPage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('exchanges the code and returns to the original page', async () => {
    localStorage.setItem(
      'spoticast.pkce',
      JSON.stringify({ verifier: 'v', state: 's1', returnTo: '/podcast/1' }),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: 'at',
            refresh_token: 'rt',
            expires_in: 3600,
            scope: 'streaming',
          }),
        ),
      ),
    );
    renderAt('/callback?code=c1&state=s1');
    expect(await screen.findByText('Back where I was')).toBeInTheDocument();
    expect(useAuth.getState().tokens?.accessToken).toBe('at');
  });

  it('shows the Spotify error', async () => {
    renderAt('/callback?error=access_denied');
    expect(await screen.findByRole('alert')).toHaveTextContent('access_denied');
  });
});
