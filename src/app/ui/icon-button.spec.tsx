import { render, screen } from '@testing-library/react';

import IconButton from './icon-button';

describe('IconButton', () => {
  it('exposes its label to assistive tech', () => {
    render(
      <IconButton label="Play">
        <svg />
      </IconButton>,
    );
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });
});
