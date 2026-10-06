import { render, screen } from '@testing-library/react';
import { queryClient } from '../lib/query/query-client';
import { useAuth } from '../lib/spotify/auth';

import App from './app';

vi.mock('../features/filters/smart-playlists-runtime', () => ({
  default: () => null,
}));
vi.mock('../features/player/player-runtime', () => ({ default: () => null }));

describe('App', () => {
  beforeEach(() => {
    // Never hit the real Spotify API: the home loads the followed shows.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ items: [], next: null }), {
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
  });

  afterEach(() => {
    useAuth.setState({ tokens: null });
    queryClient.clear();
    vi.unstubAllGlobals();
  });

  it('asks to log in when logged out', () => {
    render(<App />);
    expect(
      screen.getByRole('button', { name: /log in with spotify/i }),
    ).toBeInTheDocument();
  });

  it('shows the podcasts home when logged in', () => {
    useAuth.setState({
      tokens: {
        accessToken: 'a',
        refreshToken: 'r',
        expiresAt: Date.now() + 1e6,
        scope: '',
      },
    });
    render(<App />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Podcasts' }),
    ).toBeInTheDocument();
  });
});
