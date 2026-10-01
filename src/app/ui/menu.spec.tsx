import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Menu from './menu';

describe('Menu', () => {
  it('opens, selects and closes', async () => {
    const onSelect = vi.fn();
    render(
      <Menu
        label="Sort"
        icon={<svg />}
        items={[
          { label: 'A-Z', checked: true, onSelect: vi.fn() },
          { label: 'Latest', checked: false, onSelect },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Sort' }));
    expect(screen.getByRole('menuitemradio', { name: 'A-Z' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await userEvent.click(
      screen.getByRole('menuitemradio', { name: 'Latest' }),
    );
    expect(onSelect).toHaveBeenCalled();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
