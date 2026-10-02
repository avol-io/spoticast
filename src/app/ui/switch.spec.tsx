import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Switch from './switch';

describe('Switch', () => {
  it('toggles through its label', async () => {
    const onChange = vi.fn();
    render(<Switch label="Video only" checked={false} onChange={onChange} />);
    expect(screen.getByRole('switch', { name: 'Video only' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await userEvent.click(screen.getByRole('switch', { name: 'Video only' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
