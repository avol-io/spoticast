import { act, render, screen } from '@testing-library/react';
import { toast, useToasts } from '../../lib/storage/toasts';

import Toaster from './toaster';

describe('Toaster', () => {
  afterEach(() => useToasts.setState({ toasts: [] }));

  it('renders queued toasts', () => {
    render(<Toaster />);
    act(() => {
      toast('Added to Up Next');
    });
    expect(screen.getByText('Added to Up Next')).toBeInTheDocument();
  });
});
