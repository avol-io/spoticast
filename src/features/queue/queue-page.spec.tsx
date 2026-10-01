import { render, screen } from '@testing-library/react';

import QueuePage from './queue-page';

describe('QueuePage', () => {
  it('renders its title', () => {
    render(<QueuePage />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
