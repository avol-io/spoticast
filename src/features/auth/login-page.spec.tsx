import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import LoginPage from './login-page';

describe('LoginPage', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('enables login when a client id is configured', () => {
    vi.stubEnv('VITE_SPOTIFY_CLIENT_ID', 'abc');
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('button', { name: /log in with spotify/i }),
    ).toBeEnabled();
  });

  it('explains a missing client id', () => {
    vi.stubEnv('VITE_SPOTIFY_CLIENT_ID', '');
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('button', { name: /log in with spotify/i }),
    ).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'VITE_SPOTIFY_CLIENT_ID',
    );
  });
});
