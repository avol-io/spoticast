import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Sidebar from './sidebar';

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
});
