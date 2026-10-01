import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import BottomNav from './bottom-nav';

describe('BottomNav', () => {
  it('highlights the active section', () => {
    render(
      <MemoryRouter initialEntries={['/queue']}>
        <BottomNav />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('link')).toHaveLength(5);
    expect(screen.getByRole('link', { name: /up next/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
