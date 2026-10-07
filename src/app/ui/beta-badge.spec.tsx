import { render, screen } from '@testing-library/react';

import BetaBadge from './beta-badge';

describe('BetaBadge', () => {
  it('labels the build as beta', () => {
    render(<BetaBadge />);
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });
});
