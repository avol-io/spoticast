import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Sidebar from './sidebar';

const build = vi.hoisted(() => ({ beta: false }));
vi.mock('../../lib/build-info', () => ({
  get IS_BETA() {
    return build.beta;
  },
  get LOGO_URL() {
    return build.beta ? '/icons-beta/logo.svg' : '/logo.svg';
  },
}));

describe('Sidebar', () => {
  it('renders every section', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /podcasts/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
  });

  it('marks the beta build', () => {
    build.beta = true;
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.getByText('Beta')).toBeInTheDocument();
    build.beta = false;
  });
});
