import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from '../../lib/spotify/auth';

import RequireAuth from './require-auth';

describe('RequireAuth', () => {
  afterEach(() => useAuth.setState({ tokens: null }));

  it('shows the login page when logged out', () => {
    render(
      <MemoryRouter>
        <RequireAuth>
          <p>secret</p>
        </RequireAuth>
      </MemoryRouter>,
    );
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('renders children when logged in', () => {
    useAuth.setState({
      tokens: {
        accessToken: 'a',
        refreshToken: 'r',
        expiresAt: Date.now() + 1e6,
        scope: '',
      },
    });
    render(
      <MemoryRouter>
        <RequireAuth>
          <p>secret</p>
        </RequireAuth>
      </MemoryRouter>,
    );
    expect(screen.getByText('secret')).toBeInTheDocument();
  });
});
