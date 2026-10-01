import { render, screen } from '@testing-library/react';

import FiltersPage from './filters-page';

describe('FiltersPage', () => {
  it('renders its title', () => {
    render(<FiltersPage />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
