import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Sheet from './sheet';

describe('Sheet', () => {
  it('renders a labelled dialog and closes on Escape', async () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} label="Devices">
        <p>content</p>
      </Sheet>,
    );
    expect(screen.getByRole('dialog', { name: 'Devices' })).toHaveTextContent(
      'content',
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('renders nothing when closed', () => {
    render(
      <Sheet open={false} onClose={vi.fn()} label="x">
        <p>content</p>
      </Sheet>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
