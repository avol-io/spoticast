import { render, screen } from '@testing-library/react';

import HomePage from './home-page';

describe('HomePage', () => {
  it('renders its title', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
