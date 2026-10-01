import { render, screen } from '@testing-library/react';

import PageHeader from './page-header';

describe('PageHeader', () => {
  it('renders the title and actions', () => {
    render(<PageHeader title="Podcasts" actions={<button>Sort</button>} />);
    expect(
      screen.getByRole('heading', { name: 'Podcasts' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sort' })).toBeInTheDocument();
  });
});
