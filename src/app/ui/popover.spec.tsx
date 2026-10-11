import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Popover from './popover';

describe('Popover', () => {
  const renderPopover = () =>
    render(
      <>
        <Popover
          label="Devices"
          placement="top"
          trigger={(props) => (
            <button type="button" {...props}>
              Open
            </button>
          )}
        >
          {(close) => (
            <button type="button" onClick={close}>
              Pick
            </button>
          )}
        </Popover>
        <p>Outside</p>
      </>,
    );

  it('opens upwards and closes from its content', async () => {
    renderPopover();
    const trigger = screen.getByRole('button', { name: 'Open' });
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: 'Devices' })).toHaveClass(
      'bottom-full',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Pick' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on outside clicks and Escape', async () => {
    renderPopover();
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    await userEvent.click(screen.getByText('Outside'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
