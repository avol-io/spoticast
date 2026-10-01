import { render, screen } from '@testing-library/react';
import { useAuth } from '../lib/spotify/auth';

import App from './app';

describe('App', () => {
  afterEach(() => useAuth.setState({ tokens: null }));

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
