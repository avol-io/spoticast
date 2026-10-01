import { render, screen } from '@testing-library/react';

import EmptyState from './empty-state';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="Nothing here" description="Try later" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByText('Try later')).toBeInTheDocument();
  });
});
