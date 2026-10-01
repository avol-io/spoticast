import { render, screen } from '@testing-library/react';

import SearchPage from './search-page';

describe('SearchPage', () => {
  it('renders its title', () => {
    render(<SearchPage />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
